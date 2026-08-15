import "server-only";
import type { Workspace } from "@/types/anchor";

/**
 * Holds workspaces that real ingest (lib/services/ingest.ts) has actually
 * built or added a paper to. Same in-memory, DB-shaped pattern as
 * lib/services/jobs.ts and lib/services/share.ts -- there is no live
 * Postgres for the grounding domain yet (CLAUDE.md's current data seam), so
 * this is what a real ingested workspace lives in until one exists.
 *
 * lib/services/workspace.ts's fetchWorkspace() is the only reader: this file
 * is not a second data path, it's what that one seam falls back to before
 * the static fixture.
 */
declare global {
  var __pepirosIngestedWorkspaces: Map<string, Workspace> | undefined;
}

function store(): Map<string, Workspace> {
  if (!global.__pepirosIngestedWorkspaces) global.__pepirosIngestedWorkspaces = new Map();
  return global.__pepirosIngestedWorkspaces;
}

export function getIngestedWorkspace(workspaceId: string): Workspace | undefined {
  return store().get(workspaceId);
}

export function setIngestedWorkspace(workspace: Workspace): void {
  store().set(workspace.id, workspace);
}

export function listIngestedWorkspaces(): Workspace[] {
  return [...store().values()];
}
