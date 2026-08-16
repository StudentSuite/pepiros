import "server-only";
import type { Workspace } from "@/types/anchor";
import { getWorkspace, saveWorkspace, listWorkspaceSummaries } from "@/lib/db/queries";

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

export async function getIngestedWorkspace(workspaceId: string): Promise<Workspace | undefined> {
  return getWorkspace(workspaceId);
}

export async function setIngestedWorkspace(workspace: Workspace): Promise<void> {
  await saveWorkspace(workspace);
}

/** Every workspace real ingest has actually written -- no fixture here; lib/services/workspaces.ts's listWorkspaces() adds that. */
export async function listIngestedWorkspaces(): Promise<Workspace[]> {
  const summaries = await listWorkspaceSummaries();
  const real = await Promise.all(summaries.map((s) => getWorkspace(s.id)));
  return real.filter((w): w is Workspace => Boolean(w));
}
