import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { UserFacingError } from "@/lib/errors";
import type {
  AnchorRect,
  Chunk,
  Evidence,
  GraphEdge,
  GraphNode,
  Numeric,
  NumericComparator,
  Paper,
  Workspace,
} from "@/types/anchor";

/**
 * The grounding domain's real repository (issue #47): loads/saves a full
 * Workspace against the live Postgres project instead of the in-memory
 * global Map lib/services/ingestStore.ts used to be. That file is the only
 * caller of everything below -- keep raw drizzle out of services/*.ts.
 *
 * The `sections` table exists in the schema but the app never assigns
 * titles to sections (components/reader/SectionNav.tsx and
 * lib/prompts/contextBlock.ts both derive a label from the raw
 * `chunk.sectionId` string, there is no separate title anywhere in the
 * frozen Workspace contract in types/anchor.ts). saveWorkspace still writes
 * a placeholder row per distinct sectionId -- chunks.section_id has a real FK
 * to sections.id, so a chunk citing a section that was never inserted would
 * fail to save, not silently drop the reference.
 */

function toRects(value: unknown): AnchorRect[] {
  return (value ?? []) as AnchorRect[];
}

function toPaper(row: typeof schema.papers.$inferSelect): Paper {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    authors: row.authors,
    year: row.year,
    archetype: row.archetype,
    sourceUrl: row.sourceUrl,
    pdfStoragePath: row.pdfStoragePath,
  };
}

function toChunk(row: typeof schema.chunks.$inferSelect): Chunk {
  return {
    id: row.id,
    paperId: row.paperId,
    sectionId: row.sectionId,
    kind: row.kind,
    page: row.page,
    text: row.text,
    ordinal: row.ordinal,
    rects: toRects(row.rects),
  };
}

function toNumeric(row: typeof schema.numerics.$inferSelect): Numeric {
  return {
    id: row.id,
    chunkId: row.chunkId,
    rawText: row.rawText,
    value: row.value,
    unit: row.unit,
    comparator: row.comparator as NumericComparator | null,
    ordinal: row.ordinal,
    role: row.role,
  };
}

function toNode(row: typeof schema.nodes.$inferSelect): GraphNode {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    title: row.title,
    bodyMd: row.bodyMd,
    pillarIndex: row.pillarIndex,
    x: row.x,
    y: row.y,
    paperId: row.paperId,
    stale: row.stale,
  };
}

function toEdge(row: typeof schema.edges.$inferSelect): GraphEdge {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    kind: row.kind,
    sourceId: row.sourceId,
    targetId: row.targetId,
  };
}

function toEvidence(row: typeof schema.evidence.$inferSelect): Evidence {
  return {
    id: row.id,
    nodeId: row.nodeId,
    refId: row.refId,
    anchor:
      row.chunkId !== null && row.quote !== null
        ? { chunkId: row.chunkId, quote: row.quote, spans: toRects(row.spans) }
        : null,
    tier: row.tier,
    matchScore: row.matchScore,
    numericOk: row.numericOk,
  };
}

export interface VersionedWorkspace {
  workspace: Workspace;
  /** Pass back to `saveWorkspace()` as `expectedVersion` (issue #103) -- a write against a stale read fails loudly instead of silently overwriting whatever landed in between. */
  version: number;
}

/** Undefined when no workspace row exists under this id -- the caller falls back to the fixture. */
export async function getWorkspace(workspaceId: string): Promise<VersionedWorkspace | undefined> {
  const [row] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
  if (!row) return undefined;

  const [papersRows, nodesRows, edgesRows] = await Promise.all([
    db.select().from(schema.papers).where(eq(schema.papers.workspaceId, workspaceId)),
    db.select().from(schema.nodes).where(eq(schema.nodes.workspaceId, workspaceId)),
    db.select().from(schema.edges).where(eq(schema.edges.workspaceId, workspaceId)),
  ]);

  const paperIds = papersRows.map((p) => p.id);
  const chunksRows = paperIds.length
    ? await db.select().from(schema.chunks).where(inArray(schema.chunks.paperId, paperIds))
    : [];

  const chunkIds = chunksRows.map((c) => c.id);
  const nodeIds = nodesRows.map((n) => n.id);
  const [numericsRows, evidenceRows] = await Promise.all([
    chunkIds.length
      ? db.select().from(schema.numerics).where(inArray(schema.numerics.chunkId, chunkIds))
      : Promise.resolve([]),
    nodeIds.length
      ? db.select().from(schema.evidence).where(inArray(schema.evidence.nodeId, nodeIds))
      : Promise.resolve([]),
  ]);

  return {
    workspace: {
      id: row.id,
      name: row.name,
      papers: papersRows.map(toPaper),
      chunks: chunksRows.map(toChunk),
      numerics: numericsRows.map(toNumeric),
      nodes: nodesRows.map(toNode),
      edges: edgesRows.map(toEdge),
      evidence: evidenceRows.map(toEvidence),
    },
    version: row.version,
  };
}

/** "p2-key-finding" -> "Key Finding" -- same derivation as SectionNav's, just to fill a NOT NULL title no reader ever shows. */
function placeholderSectionTitle(sectionId: string): string {
  const withoutPaperPrefix = sectionId.replace(/^.+-s/, "");
  return withoutPaperPrefix
    .split("-")
    .map((word) => (word.length ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ") || sectionId;
}

/**
 * Upserts an entire Workspace snapshot. Callers (lib/services/ingest.ts,
 * synthesis.ts) always pass the full merged workspace (everything that
 * existed plus what they just added), the same shape the old in-memory Map
 * stored wholesale -- so every row is upserted by id rather than diffed.
 * Wasteful on unchanged rows at this data volume (a handful of papers per
 * workspace), never wrong: ids are assigned once and never reused (chunks.ts/
 * numerics.ts's ordinal comments), so re-writing an unchanged row is a no-op
 * write, not a collision.
 *
 * That "re-writing is a no-op" claim only holds for a row nothing else
 * touched in the meantime (issue #103). Every caller reads a full snapshot,
 * changes one thing in memory, then calls this with the *whole* merged
 * result -- so two overlapping requests (a manual edit racing a background
 * synthesis run, a plain delete racing an edit) each write back their own
 * stale snapshot of everything else, and whichever commits second silently
 * wins. `expectedVersion`, when given, makes that race fail loudly instead:
 * pass the `version` `getWorkspace()`/`getIngestedWorkspace()` returned
 * alongside the snapshot this write was built from. Omitted only when there
 * was no prior versioned read to guard against -- a workspace's first-ever
 * write, or a caller that degraded to the static fixture.
 */
export async function saveWorkspace(
  workspace: Workspace,
  expectedVersion?: number,
  /**
   * Issue #231: set only on the first insert of a workspace. A later write
   * must never reassign ownership as a side effect of saving a node, so the
   * update branch below deliberately does not touch owner_id.
   */
  ownerId?: string | null,
): Promise<number> {
  // A real transaction, not just sequential awaits: without one, a concurrent
  // reader (another request mid-ingest, or -- how this was actually caught --
  // two test files hitting the same shared "ws-1" row in parallel) could
  // observe a partially-written workspace, e.g. papers committed but chunks
  // not yet, and see 0 numerics/chunks that are really just not there *yet*.
  return await db.transaction(async (tx) => {
    let newVersion: number;

    if (expectedVersion === undefined) {
      const [row] = await tx
        .insert(schema.workspaces)
        .values({ id: workspace.id, name: workspace.name, ownerId: ownerId ?? null })
        .onConflictDoUpdate({
          target: schema.workspaces.id,
          // owner_id is absent here on purpose: this branch also runs for an
          // existing row, and re-saving a workspace must not transfer it.
          set: { name: workspace.name, version: sql`${schema.workspaces.version} + 1` },
        })
        .returning({ version: schema.workspaces.version });
      newVersion = row!.version;
    } else {
      // Zero rows matched means either the version moved (a real conflict)
      // or the row is already gone -- either way this write is against
      // something that is no longer true, so it must not proceed.
      const [row] = await tx
        .update(schema.workspaces)
        .set({ name: workspace.name, version: sql`${schema.workspaces.version} + 1` })
        .where(and(eq(schema.workspaces.id, workspace.id), eq(schema.workspaces.version, expectedVersion)))
        .returning({ version: schema.workspaces.version });
      if (!row) {
        throw new UserFacingError(
          "This workspace changed while that request was in flight. Refresh and try again.",
        );
      }
      newVersion = row.version;
    }

    if (workspace.papers.length > 0) {
      await tx
        .insert(schema.papers)
        .values(
          workspace.papers.map((p) => ({
            id: p.id,
            workspaceId: p.workspaceId,
            title: p.title,
            authors: p.authors,
            year: p.year,
            archetype: p.archetype,
            sourceUrl: p.sourceUrl,
            pdfStoragePath: p.pdfStoragePath,
          })),
        )
        .onConflictDoNothing({ target: schema.papers.id });
    }

    const sectionRows = new Map<string, { id: string; paperId: string; title: string; order: number }>();
    for (const chunk of workspace.chunks) {
      if (!chunk.sectionId || sectionRows.has(chunk.sectionId)) continue;
      sectionRows.set(chunk.sectionId, {
        id: chunk.sectionId,
        paperId: chunk.paperId,
        title: placeholderSectionTitle(chunk.sectionId),
        order: sectionRows.size,
      });
    }
    if (sectionRows.size > 0) {
      await tx.insert(schema.sections).values([...sectionRows.values()]).onConflictDoNothing({ target: schema.sections.id });
    }

    if (workspace.chunks.length > 0) {
      await tx
        .insert(schema.chunks)
        .values(
          workspace.chunks.map((c) => ({
            id: c.id,
            workspaceId: workspace.id,
            paperId: c.paperId,
            sectionId: c.sectionId,
            kind: c.kind,
            page: c.page,
            text: c.text,
            ordinal: c.ordinal,
            rects: c.rects,
          })),
        )
        .onConflictDoNothing({ target: schema.chunks.id });
    }

    if (workspace.numerics.length > 0) {
      await tx
        .insert(schema.numerics)
        .values(
          workspace.numerics.map((n) => ({
            id: n.id,
            workspaceId: workspace.id,
            chunkId: n.chunkId,
            rawText: n.rawText,
            value: n.value,
            unit: n.unit,
            comparator: n.comparator,
            role: n.role,
            ordinal: n.ordinal,
          })),
        )
        .onConflictDoNothing({ target: schema.numerics.id });
    }

    if (workspace.nodes.length > 0) {
      await tx
        .insert(schema.nodes)
        .values(
          workspace.nodes.map((n) => ({
            id: n.id,
            workspaceId: n.workspaceId,
            paperId: n.paperId,
            type: n.type,
            title: n.title,
            bodyMd: n.bodyMd,
            pillarIndex: n.pillarIndex,
            x: n.x,
            y: n.y,
            stale: n.stale,
          })),
        )
        .onConflictDoUpdate({
          target: schema.nodes.id,
          set: { title: sql`excluded.title`, bodyMd: sql`excluded.body_md`, stale: sql`excluded.stale` },
        });
    }

    if (workspace.edges.length > 0) {
      await tx
        .insert(schema.edges)
        .values(
          workspace.edges.map((e) => ({
            id: e.id,
            workspaceId: e.workspaceId,
            kind: e.kind,
            sourceId: e.sourceId,
            targetId: e.targetId,
          })),
        )
        // Issue #175: onConflictDoUpdate on `kind`, not onConflictDoNothing --
        // lib/services/synthesis.ts's pairwise relation edges now use a
        // deterministic id per paper pair so a repeat compare run updates
        // the same edge instead of duplicating it, but the classified
        // relation (agrees/contradicts/...) can legitimately come back
        // different across two runs of the same non-deterministic
        // generateObject call. onConflictDoNothing would silently keep the
        // *first* run's kind forever even after the nodes it connects have
        // already been updated to the new one, which is exactly the kind of
        // node-vs-edge drift this app works hard to avoid elsewhere. Every
        // other edge writer's ids are effectively unique on each call
        // (random suffixes), so this is a no-op for them either way.
        .onConflictDoUpdate({
          target: schema.edges.id,
          set: { kind: sql`excluded.kind` },
        });
    }

    if (workspace.evidence.length > 0) {
      await tx
        .insert(schema.evidence)
        .values(
          workspace.evidence.map((e) => ({
            id: e.id,
            nodeId: e.nodeId,
            chunkId: e.anchor?.chunkId ?? null,
            refId: e.refId,
            quote: e.anchor?.quote ?? null,
            spans: e.anchor?.spans ?? null,
            tier: e.tier,
            matchScore: e.matchScore,
            numericOk: e.numericOk,
          })),
        )
        // Issue #77: re-verifying an existing node's evidence on a body edit
        // updates the *same* evidence row ids with a new tier/matchScore/
        // anchor -- onConflictDoNothing silently dropped exactly that
        // update, since every prior caller only ever inserted brand-new
        // evidence rows and never needed to change one already saved.
        .onConflictDoUpdate({
          target: schema.evidence.id,
          set: {
            chunkId: sql`excluded.chunk_id`,
            quote: sql`excluded.quote`,
            spans: sql`excluded.spans`,
            tier: sql`excluded.tier`,
            matchScore: sql`excluded.match_score`,
            numericOk: sql`excluded.numeric_ok`,
          },
        });
    }

    return newVersion;
  });
}

/**
 * saveWorkspace() above is deliberately upsert-only (its own doc comment:
 * "every row is upserted by id rather than diffed") -- issue #54's
 * deleteNode() is the first caller that needs a row to actually disappear,
 * which an upsert-only write can never do: a row absent from the object
 * passed to saveWorkspace() is simply never mentioned, not removed. This is
 * a real DELETE instead, relying on the schema's own ON DELETE CASCADE on
 * edges.source_id/target_id and evidence.node_id (0000_dear_bishop.sql) to
 * remove the deleted node's own edges/evidence -- lib/services/nodes.ts's
 * deleteNode() only needs to tell this which *other* nodes to mark stale
 * first (edges pointing at the deleted node from a content-dependent kind).
 *
 * Issue #161: no `expectedVersion` check here, on purpose, unlike
 * saveWorkspace() above. That check exists because saveWorkspace() upserts
 * a *whole in-memory snapshot* -- two concurrent callers each holding a
 * stale copy of "everything else" could silently clobber each other's
 * unrelated changes to it, the real lost-update risk issue #103 fixed.
 * This function does the opposite: two precise, targeted mutations
 * (mark *these* ids stale, delete *this* one id) that can't lose a
 * concurrent update to different rows no matter what version the
 * workspace is at. An earlier version of this fix added the same
 * expectedVersion gate here anyway "for consistency" -- which promptly
 * reintroduced the exact bug it was meant to close: two unrelated
 * concurrent deletes, each reading the same starting version, made the
 * second one fail with a spurious conflict, since both were still racing
 * on one shared counter for operations that never actually overlapped.
 * The version bump below is unconditional (still real, for anything that
 * polls `workspace.version` to know something changed) but never blocks
 * this function's own delete on it.
 */
export async function deleteNodeCascade(workspaceId: string, nodeId: string, staleNodeIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.workspaces)
      .set({ version: sql`${schema.workspaces.version} + 1` })
      .where(eq(schema.workspaces.id, workspaceId));

    if (staleNodeIds.length > 0) {
      await tx.update(schema.nodes).set({ stale: true }).where(inArray(schema.nodes.id, staleNodeIds));
    }
    await tx.delete(schema.nodes).where(eq(schema.nodes.id, nodeId));
  });
}

/**
 * Issue #77: an inspector body edit had no history at all -- the previous
 * bodyMd was simply gone once saveWorkspace()'s onConflictDoUpdate replaced
 * it. Called with the *pre-edit* body, before that overwrite, so a
 * node_versions row is the text being superseded, not the new text -- the
 * schema's own `node_id` FK is `on delete cascade` (lib/db/schema.ts), so
 * these clean up automatically if the node itself is later deleted.
 */
export async function createNodeVersion(nodeId: string, bodyMd: string): Promise<void> {
  await db.insert(schema.nodeVersions).values({
    id: `nv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nodeId,
    bodyMd,
  });
}

export interface WorkspaceSummaryRow {
  id: string;
  name: string;
  paperCount: number;
}

/**
 * Workspaces, cheaply (a grouped count, not a full assemble-per-workspace
 * pass).
 *
 * Issue #231: `ownerId` scopes the result to one account. Passing undefined
 * returns every row and is for the unscoped internal callers only (the MCP
 * tool path, which authenticates by token rather than by web session). A
 * NULL-owner row belongs to nobody and is never returned to an owner-scoped
 * query, since attributing a legacy workspace to whoever happens to ask is
 * the bug this column exists to prevent.
 */
export async function listWorkspaceSummaries(ownerId?: string): Promise<WorkspaceSummaryRow[]> {
  const base = db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      paperCount: sql<number>`count(${schema.papers.id})::int`,
    })
    .from(schema.workspaces)
    .leftJoin(schema.papers, eq(schema.papers.workspaceId, schema.workspaces.id));

  const rows = ownerId
    ? await base
        .where(eq(schema.workspaces.ownerId, ownerId))
        .groupBy(schema.workspaces.id, schema.workspaces.name)
    : await base.groupBy(schema.workspaces.id, schema.workspaces.name);
  return rows;
}

/**
 * The owner of a workspace, or null when it has none (legacy row) or the
 * workspace does not exist. Distinguishing those two is the caller's job:
 * requireWorkspaceExists() already handles not-found separately.
 */
export async function getWorkspaceOwnerId(workspaceId: string): Promise<string | null> {
  const [row] = await db
    .select({ ownerId: schema.workspaces.ownerId })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  return row?.ownerId ?? null;
}

export async function workspaceRowExists(workspaceId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  return Boolean(row);
}

// --- MCP tokens (issue #109) -----------------------------------------------
// Real Postgres, not the gitignored JSON file lib/services/mcpTokens.ts used
// to keep -- see schema.ts's mcpTokens doc comment for why the remote
// streamable-HTTP transport needed that swap.

export type McpTokenRow = typeof schema.mcpTokens.$inferSelect;

export async function insertMcpTokenRow(input: {
  id: string;
  tokenHash: string;
  scope: "read" | "write";
  workspaceId: string | null;
  label: string;
  profileId: string | null;
}): Promise<void> {
  await db.insert(schema.mcpTokens).values(input);
}

/**
 * Issue #150: every non-revoked token scoped to one owner, newest first --
 * this used to return every user's tokens with no filter at all, so any
 * signed-in user could see (and, via revokeMcpTokenRow, revoke) any other
 * user's tokens. A null-owner row (predates the profile_id column) is
 * never returned to anyone.
 */
export async function listActiveMcpTokenRows(profileId: string): Promise<McpTokenRow[]> {
  return db
    .select()
    .from(schema.mcpTokens)
    .where(and(isNull(schema.mcpTokens.revokedAt), eq(schema.mcpTokens.profileId, profileId)))
    .orderBy(desc(schema.mcpTokens.createdAt));
}

export async function findMcpTokenRowByHash(tokenHash: string): Promise<McpTokenRow | undefined> {
  const [row] = await db.select().from(schema.mcpTokens).where(eq(schema.mcpTokens.tokenHash, tokenHash));
  return row;
}

export async function touchMcpTokenRow(id: string): Promise<void> {
  await db.update(schema.mcpTokens).set({ lastUsedAt: new Date() }).where(eq(schema.mcpTokens.id, id));
}

/**
 * Issue #150: only revokes a token owned by `profileId` -- returns false
 * (not found/already revoked/not yours) rather than revoking regardless of
 * caller, which is what let any signed-in user revoke any other user's
 * token by id.
 */
export async function revokeMcpTokenRow(id: string, profileId: string): Promise<boolean> {
  const rows = await db
    .update(schema.mcpTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.mcpTokens.id, id),
        eq(schema.mcpTokens.profileId, profileId),
        isNull(schema.mcpTokens.revokedAt),
      ),
    )
    .returning({ id: schema.mcpTokens.id });
  return rows.length > 0;
}

// --- MCP OAuth (issue #109) -------------------------------------------------
// RFC 7591 dynamic client registration + the authorization-code exchange
// docs/PLAN-V1.md §13.4 specs for the remote streamable-HTTP transport.

export type McpOAuthClientRow = typeof schema.mcpOAuthClients.$inferSelect;

export async function insertMcpOAuthClient(input: {
  clientId: string;
  clientSecretHash: string | null;
  clientName: string | null;
  redirectUris: string[];
}): Promise<void> {
  await db.insert(schema.mcpOAuthClients).values(input);
}

export async function findMcpOAuthClient(clientId: string): Promise<McpOAuthClientRow | undefined> {
  const [row] = await db.select().from(schema.mcpOAuthClients).where(eq(schema.mcpOAuthClients.clientId, clientId));
  return row;
}

export async function insertMcpOAuthCode(input: {
  id: string;
  codeHash: string;
  clientId: string;
  profileId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: "read" | "write";
  workspaceId: string | null;
  expiresAt: Date;
}): Promise<void> {
  await db.insert(schema.mcpOAuthCodes).values(input);
}

export type McpOAuthCodeRow = typeof schema.mcpOAuthCodes.$inferSelect;

export async function findMcpOAuthCodeByHash(codeHash: string): Promise<McpOAuthCodeRow | undefined> {
  const [row] = await db.select().from(schema.mcpOAuthCodes).where(eq(schema.mcpOAuthCodes.codeHash, codeHash));
  return row;
}

/** Single-use: only marks the code used if it hadn't been already, so a replayed code loses the race deterministically instead of both callers thinking they won. */
export async function markMcpOAuthCodeUsed(id: string): Promise<boolean> {
  const rows = await db
    .update(schema.mcpOAuthCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.mcpOAuthCodes.id, id), isNull(schema.mcpOAuthCodes.usedAt)))
    .returning({ id: schema.mcpOAuthCodes.id });
  return rows.length > 0;
}

/**
 * Issue #159: one atomic UPSERT does the increment-or-reset-and-check in a
 * single statement, so two concurrent requests on the same key can't both
 * read a stale count before either commits (the lost-update shape a plain
 * SELECT-then-UPDATE would have). If the existing window has expired
 * (its window_start is older than windowMs ago), this resets to a fresh
 * window of 1; otherwise it increments the existing window's count.
 * Returns the row as it stands *after* this call's own increment, so the
 * caller compares against its limit post-increment.
 */
export async function incrementRateLimitWindow(
  key: string,
  windowMs: number,
): Promise<{ count: number; windowStart: Date }> {
  // The postgres-js driver's raw `sql` template needs a plain string/number,
  // not a Date instance, for its parameter binding -- drizzle's fluent
  // builders (.set({ col: new Date() })) handle that conversion themselves,
  // but this raw UPSERT doesn't go through them.
  const nowIso = new Date().toISOString();
  const rows = await db.execute<{ count: number; window_start: string }>(sql`
    INSERT INTO mcp_rate_limit_windows (key, count, window_start)
    VALUES (${key}, 1, ${nowIso}::timestamptz)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN mcp_rate_limit_windows.window_start <= ${nowIso}::timestamptz - make_interval(secs => ${windowMs / 1000})
          THEN 1
        ELSE mcp_rate_limit_windows.count + 1
      END,
      window_start = CASE
        WHEN mcp_rate_limit_windows.window_start <= ${nowIso}::timestamptz - make_interval(secs => ${windowMs / 1000})
          THEN ${nowIso}::timestamptz
        ELSE mcp_rate_limit_windows.window_start
      END
    RETURNING count, window_start
  `);
  const row = rows[0]!;
  return { count: row.count, windowStart: new Date(row.window_start) };
}

// --- Admin stats (issue #234) ----------------------------------------------

export interface CorpusStats {
  workspaces: number;
  papers: number;
  chunks: number;
  nodes: number;
  edges: number;
  evidence: number;
  /** Evidence rows by tier, so grounding quality is visible, not just volume. */
  evidenceByTier: Array<{ tier: string; count: number }>;
  conversations: number;
  jobs: number;
  jobsFailed: number;
}

/**
 * Counts across the whole corpus, for /admin.
 *
 * Deliberately counts rather than assembling: this is a dashboard, and
 * loading every workspace to call `.length` on it is how a stats page becomes
 * the slowest route on the site.
 */
export async function getCorpusStats(): Promise<CorpusStats> {
  const [
    workspaceRows,
    paperRows,
    chunkRows,
    nodeRows,
    edgeRows,
    evidenceRows,
    tierRows,
    conversationRows,
    jobRows,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.workspaces),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.papers),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.chunks),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.nodes),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.edges),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.evidence),
    db
      .select({ tier: schema.evidence.tier, n: sql<number>`count(*)::int` })
      .from(schema.evidence)
      .groupBy(schema.evidence.tier),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.conversations),
    db
      .select({ status: schema.jobs.status, n: sql<number>`count(*)::int` })
      .from(schema.jobs)
      .groupBy(schema.jobs.status),
  ]);

  const jobs = jobRows.reduce((total, row) => total + row.n, 0);
  const jobsFailed = jobRows.find((row) => row.status === "failed")?.n ?? 0;

  return {
    workspaces: workspaceRows[0]?.n ?? 0,
    papers: paperRows[0]?.n ?? 0,
    chunks: chunkRows[0]?.n ?? 0,
    nodes: nodeRows[0]?.n ?? 0,
    edges: edgeRows[0]?.n ?? 0,
    evidence: evidenceRows[0]?.n ?? 0,
    evidenceByTier: tierRows.map((row) => ({ tier: row.tier, count: row.n })),
    conversations: conversationRows[0]?.n ?? 0,
    jobs,
    jobsFailed,
  };
}

// --- Catalog indexing (issue #279) -----------------------------------------

export interface IndexedCatalogEntry {
  slug: string;
  workspaceId: string;
  paperId: string;
}

/** Every catalog paper this deployment has actually indexed. */
export async function getIndexedCatalogEntries(): Promise<IndexedCatalogEntry[]> {
  const rows = await db
    .select({
      slug: schema.indexedCatalog.slug,
      workspaceId: schema.indexedCatalog.workspaceId,
      paperId: schema.indexedCatalog.paperId,
    })
    .from(schema.indexedCatalog);
  return rows;
}

/**
 * Upsert, not insert: re-indexing a paper (a better model, a fixed parser)
 * should repoint the slug at the new workspace rather than fail on a
 * duplicate key and leave the catalog pointing at the older graph.
 */
export async function upsertIndexedCatalogEntry(entry: IndexedCatalogEntry): Promise<void> {
  await db
    .insert(schema.indexedCatalog)
    .values(entry)
    .onConflictDoUpdate({
      target: schema.indexedCatalog.slug,
      set: { workspaceId: entry.workspaceId, paperId: entry.paperId, indexedAt: new Date() },
    });
}
