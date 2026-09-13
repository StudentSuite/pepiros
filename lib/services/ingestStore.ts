import "server-only";
import type { Workspace } from "@/types/anchor";
import {
  getWorkspace,
  saveWorkspace,
  listWorkspaceSummaries,
  deleteNodeCascade,
  createNodeVersion,
  type VersionedWorkspace,
  type WorkspaceSummaryRow,
} from "@/lib/db/queries";
import { UserFacingError } from "@/lib/errors";
import { isDatabaseConfigured } from "@/lib/db/client";

/**
 * Holds workspaces that real ingest (lib/services/ingest.ts) has actually
 * built or added a paper to. Backed by the live Postgres project via
 * lib/db/queries/index.ts (issue #47) -- this used to be a `global`
 * in-memory Map, which meant a paper ingested in one server run had no
 * graph left the next time the process started (every dev-server restart,
 * every Vercel cold start). Same seam, same function names, real storage.
 *
 * lib/services/workspace.ts's fetchWorkspace() is the only reader: this file
 * is not a second data path, it's what that one seam falls back to before
 * the static fixture.
 */

/**
 * Reads only (writes below still throw loudly -- silently pretending a save
 * succeeded would be real data loss) fall back to "nothing ingested" in
 * exactly two cases: no workspace row exists under the id, or no DATABASE_URL
 * is configured at all. Both keep CLAUDE.md's contract "the app runs fine on
 * fixtures/workspace.json without [a DB]" and fetchWorkspace()'s promise in
 * lib/services/workspace.ts to resolve any never-ingested id to the fixture.
 *
 * A query that fails against a *configured* database (bad creds, unreachable
 * host, connection timeout) instead rethrows. Issue #56 was the original
 * reason for any catch at all -- no DATABASE_URL used to mean a 32s hang then
 * a 500 on every route, so that case must still degrade quietly to the
 * fixture. Issue #409 is the opposite failure and this catch was swallowing
 * it too: a workspace that failed to load because the DB is misconfigured or
 * unreachable hit the exact same "nothing ingested" path as one that was
 * never ingested into, quietly swapping someone's real audited graph for the
 * sample file while still looking like it worked. For a tool whose whole
 * purpose is catching a misconduct-risk citation error, that silent substitution
 * is the worst failure mode it has. Logged to stderr, never stdout
 * (mcp/stdio.ts's transport), so a real outage stays visible either way.
 */
export async function getIngestedWorkspace(workspaceId: string): Promise<VersionedWorkspace | undefined> {
  try {
    return await getWorkspace(workspaceId);
  } catch (err) {
    // No DATABASE_URL at all is the intentional local/no-backend mode -- keep
    // the fixture fallback (issue #56).
    if (!isDatabaseConfigured()) {
      console.error(`[ingestStore] getWorkspace(${workspaceId}) unavailable, falling back to the fixture:`, err);
      return undefined;
    }
    // DB is configured but the read genuinely failed -- rethrow so the caller
    // (and the person relying on the audit) finds out instead of getting a
    // fake "it worked" fixture (issue #409).
    console.error(`[ingestStore] getWorkspace(${workspaceId}) failed against a configured DATABASE_URL:`, err);
    throw err;
  }
}

/**
 * Still throws on failure -- silently pretending a save succeeded would be
 * real data loss, per the doc comment above -- but with a message safe to
 * show a user rather than whatever the driver raised. A raw connection
 * error (e.g. `getaddrinfo ENOTFOUND db.<ref>.supabase.co`) used to reach
 * the client as-is through the API route's catch block and render directly
 * in the UI (e.g. components/chat/PromoteButton.tsx's inline error), which
 * both leaks an internal hostname and reads as gibberish to a reader who
 * just clicked "Promote to Node." The real error is still logged to stderr
 * for debugging, same place getIngestedWorkspace() above logs its own.
 */
async function guardedWrite<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // A UserFacingError is already a deliberate, safe-to-show message --
    // issue #103's version conflict, in particular -- so it passes through
    // unchanged instead of being flattened into the generic one below.
    if (err instanceof UserFacingError) throw err;
    console.error(`[ingestStore] ${label} failed:`, err);
    throw new UserFacingError("Could not save this change to the workspace database right now. Try again in a moment.");
  }
}

/**
 * `expectedVersion`, when given, is the `version` a prior `getIngestedWorkspace()`
 * read returned alongside `workspace` -- pass it so a write against a
 * snapshot someone else has since changed fails loudly (issue #103) instead
 * of silently overwriting them. Omit only when there was no such prior read
 * (a workspace's first-ever write, or a caller that degraded to the fixture).
 */
export async function setIngestedWorkspace(
  workspace: Workspace,
  expectedVersion?: number,
  /** Issue #231: applied on first insert only, see saveWorkspace(). */
  ownerId?: string | null,
): Promise<number> {
  return await guardedWrite(`saveWorkspace(${workspace.id})`, () =>
    saveWorkspace(workspace, expectedVersion, ownerId),
  );
}

/**
 * Real removal, not an upsert -- see lib/db/queries/index.ts's
 * deleteNodeCascade() for why this can't just be another setIngestedWorkspace()
 * call. `staleNodeIds` are marked stale in the same transaction as the
 * delete. Issue #161: deliberately no `expectedVersion` param -- see
 * deleteNodeCascade's own doc comment for why a version *check* doesn't
 * belong on this precise, targeted mutation the way it does on
 * setIngestedWorkspace's full-snapshot upsert.
 */
export async function deleteIngestedNode(workspaceId: string, nodeId: string, staleNodeIds: string[]): Promise<void> {
  await guardedWrite(`deleteNodeCascade(${nodeId})`, () => deleteNodeCascade(workspaceId, nodeId, staleNodeIds));
}

/** Records the body being superseded by an inspector edit -- see lib/db/queries's createNodeVersion() doc comment. */
export async function recordNodeVersion(nodeId: string, bodyMd: string): Promise<void> {
  await guardedWrite(`createNodeVersion(${nodeId})`, () => createNodeVersion(nodeId, bodyMd));
}

/**
 * Every workspace real ingest has actually written -- no fixture here;
 * lib/services/workspaces.ts's listWorkspaces() adds that.
 *
 * Issue #179: this used to call getWorkspace() (5-7 queries: papers,
 * nodes, edges, chunks, numerics, evidence) for *every* workspace just to
 * read back `.papers.length` -- N workspaces meant 1 + 7N queries pulling
 * every chunk/node/evidence row in the whole account to compute a count a
 * single grouped-count query (listWorkspaceSummaries) already produces.
 * Only caller (listWorkspaces()) ever needed the summary shape.
 */
export async function listIngestedWorkspaces(ownerId?: string): Promise<WorkspaceSummaryRow[]> {
  try {
    return await listWorkspaceSummaries(ownerId);
  } catch (err) {
    console.error("[ingestStore] listWorkspaceSummaries() unavailable:", err);
    return [];
  }
}
