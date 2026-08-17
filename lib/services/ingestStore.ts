import "server-only";
import type { Workspace } from "@/types/anchor";
import { getWorkspace, saveWorkspace, listWorkspaceSummaries, deleteNodeCascade, createNodeVersion } from "@/lib/db/queries";

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
export async function getIngestedWorkspace(workspaceId: string): Promise<Workspace | undefined> {
  try {
    return await getWorkspace(workspaceId);
  } catch (err) {
    console.error(`[ingestStore] getWorkspace(${workspaceId}) unavailable, falling back to the fixture:`, err);
    return undefined;
  }
}

export async function setIngestedWorkspace(workspace: Workspace): Promise<void> {
  await saveWorkspace(workspace);
}

/**
 * Real removal, not an upsert -- see lib/db/queries/index.ts's
 * deleteNodeCascade() for why this can't just be another setIngestedWorkspace()
 * call. `staleNodeIds` are marked stale in the same transaction as the delete.
 */
export async function deleteIngestedNode(nodeId: string, staleNodeIds: string[]): Promise<void> {
  await deleteNodeCascade(nodeId, staleNodeIds);
}

/** Records the body being superseded by an inspector edit -- see lib/db/queries's createNodeVersion() doc comment. */
export async function recordNodeVersion(nodeId: string, bodyMd: string): Promise<void> {
  await createNodeVersion(nodeId, bodyMd);
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
  return real.filter((w): w is Workspace => Boolean(w));
}
