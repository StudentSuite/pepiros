import "server-only";
import type { Workspace } from "@/types/anchor";
import { getWorkspace, saveWorkspace, listWorkspaceSummaries, deleteNodeCascade, createNodeVersion, type VersionedWorkspace } from "@/lib/db/queries";
import { UserFacingError } from "@/lib/errors";

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
 * succeeded would be real data loss) fall back to "nothing ingested" on any
 * DB error, not just "no row found": CLAUDE.md's own contract is "the app
 * runs fine on fixtures/workspace.json without it," and lib/services/
 * workspace.ts's fetchWorkspace() doc comment promises the same for any
 * never-ingested id. A missing DATABASE_URL, an unreachable host, or a
 * connection timeout used to just mean "the in-memory Map is empty" before
 * this was wired to real Postgres (issue #47) -- without this catch, the
 * same conditions instead 500 every route that reads a workspace (issue
 * #56, reproduced live: a 32s hang then a 500, on a read that's supposed to
 * degrade to the static fixture with no backend at all). Logged to stderr,
 * never stdout (mcp/stdio.ts's transport), so a real outage stays visible.
 */
export async function getIngestedWorkspace(workspaceId: string): Promise<VersionedWorkspace | undefined> {
  try {
    return await getWorkspace(workspaceId);
  } catch (err) {
    console.error(`[ingestStore] getWorkspace(${workspaceId}) unavailable, falling back to the fixture:`, err);
    return undefined;
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
export async function setIngestedWorkspace(workspace: Workspace, expectedVersion?: number): Promise<number> {
  return await guardedWrite(`saveWorkspace(${workspace.id})`, () => saveWorkspace(workspace, expectedVersion));
}

/**
 * Real removal, not an upsert -- see lib/db/queries/index.ts's
 * deleteNodeCascade() for why this can't just be another setIngestedWorkspace()
 * call. `staleNodeIds` are marked stale in the same transaction as the delete.
 */
export async function deleteIngestedNode(nodeId: string, staleNodeIds: string[]): Promise<void> {
  await guardedWrite(`deleteNodeCascade(${nodeId})`, () => deleteNodeCascade(nodeId, staleNodeIds));
}

/** Records the body being superseded by an inspector edit -- see lib/db/queries's createNodeVersion() doc comment. */
export async function recordNodeVersion(nodeId: string, bodyMd: string): Promise<void> {
  await guardedWrite(`createNodeVersion(${nodeId})`, () => createNodeVersion(nodeId, bodyMd));
}

/** Every workspace real ingest has actually written -- no fixture here; lib/services/workspaces.ts's listWorkspaces() adds that. */
export async function listIngestedWorkspaces(): Promise<Workspace[]> {
  let summaries;
  try {
    summaries = await listWorkspaceSummaries();
  } catch (err) {
    console.error("[ingestStore] listWorkspaceSummaries() unavailable:", err);
    return [];
  }
  const real = await Promise.all(summaries.map((s) => getWorkspace(s.id)));
  return real.filter((w): w is VersionedWorkspace => Boolean(w)).map((w) => w.workspace);
}
