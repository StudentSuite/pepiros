import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
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

/** Undefined when no workspace row exists under this id -- the caller falls back to the fixture. */
export async function getWorkspace(workspaceId: string): Promise<Workspace | undefined> {
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
    id: row.id,
    name: row.name,
    papers: papersRows.map(toPaper),
    chunks: chunksRows.map(toChunk),
    numerics: numericsRows.map(toNumeric),
    nodes: nodesRows.map(toNode),
    edges: edgesRows.map(toEdge),
    evidence: evidenceRows.map(toEvidence),
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
 */
export async function saveWorkspace(workspace: Workspace): Promise<void> {
  // A real transaction, not just sequential awaits: without one, a concurrent
  // reader (another request mid-ingest, or -- how this was actually caught --
  // two test files hitting the same shared "ws-1" row in parallel) could
  // observe a partially-written workspace, e.g. papers committed but chunks
  // not yet, and see 0 numerics/chunks that are really just not there *yet*.
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.workspaces)
      .values({ id: workspace.id, name: workspace.name })
      .onConflictDoUpdate({ target: schema.workspaces.id, set: { name: workspace.name } });

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
        .onConflictDoNothing({ target: schema.edges.id });
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
        .onConflictDoNothing({ target: schema.evidence.id });
    }
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
 */
export async function deleteNodeCascade(nodeId: string, staleNodeIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    if (staleNodeIds.length > 0) {
      await tx.update(schema.nodes).set({ stale: true }).where(inArray(schema.nodes.id, staleNodeIds));
    }
    await tx.delete(schema.nodes).where(eq(schema.nodes.id, nodeId));
  });
}

export interface WorkspaceSummaryRow {
  id: string;
  name: string;
  paperCount: number;
}

/** Every real workspace, cheaply (a grouped count, not a full assemble-per-workspace pass). */
export async function listWorkspaceSummaries(): Promise<WorkspaceSummaryRow[]> {
  const rows = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      paperCount: sql<number>`count(${schema.papers.id})::int`,
    })
    .from(schema.workspaces)
    .leftJoin(schema.papers, eq(schema.papers.workspaceId, schema.workspaces.id))
    .groupBy(schema.workspaces.id, schema.workspaces.name);
  return rows;
}

export async function workspaceRowExists(workspaceId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  return Boolean(row);
}
