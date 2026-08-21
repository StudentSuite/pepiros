import "server-only";
import { randomUUID } from "node:crypto";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { getIngestedWorkspace, listIngestedWorkspaces, setIngestedWorkspace } from "./ingestStore";

/**
 * Multi-workspace listing/creation for the MCP `list_workspaces`/
 * `create_workspace` tools. Reads/writes through lib/services/ingestStore.ts
 * -- the same in-memory seam lib/services/ingest.ts merges parsed papers
 * into -- so a workspace created here is immediately a real target for
 * `add_paper`, and fetchWorkspace() resolves it without any second path.
 */

export interface WorkspaceSummary {
  id: string;
  name: string;
  paperCount: number;
}

const FIXTURE_ID = (workspaceFixture as unknown as Workspace).id;

function summarize(workspace: Workspace): WorkspaceSummary {
  return { id: workspace.id, name: workspace.name, paperCount: workspace.papers.length };
}

/**
 * The fixture is always listed unless something has been ingested under its
 * own id, in which case that (now-merged) entry supersedes it rather than
 * showing up twice.
 *
 * Issue #179: listIngestedWorkspaces() now returns this same summary shape
 * directly (one grouped-count query), rather than a full per-workspace
 * assemble this used to reduce down to just `.papers.length` anyway.
 */
/**
 * Issue #231: `ownerId` scopes the listing to one account. Omitted, this
 * returns every workspace and is for the token-authenticated MCP path only;
 * the web `/workspaces` page must always pass the session's profile id, or it
 * shows one account every other account's workspaces.
 *
 * The demo fixture is listed either way. It is deliberately public (see
 * middleware.ts: "sign-in buys persistence, not access") and is the workspace
 * a guest is invited into, so it is not somebody's private property to scope.
 */
export async function listWorkspaces(ownerId?: string): Promise<WorkspaceSummary[]> {
  const ingested = await listIngestedWorkspaces(ownerId);
  const summaries: WorkspaceSummary[] = [...ingested];
  if (!ingested.some((w) => w.id === FIXTURE_ID)) {
    summaries.unshift(summarize(workspaceFixture as unknown as Workspace));
  }
  return summaries;
}

export async function createWorkspace(name: string, ownerId?: string | null): Promise<WorkspaceSummary> {
  const workspace: Workspace = {
    id: `ws-${randomUUID().slice(0, 8)}`,
    name,
    papers: [],
    chunks: [],
    numerics: [],
    nodes: [],
    edges: [],
    evidence: [],
  };
  await setIngestedWorkspace(workspace, undefined, ownerId);
  return summarize(workspace);
}

export async function workspaceExists(workspaceId: string): Promise<boolean> {
  return workspaceId === FIXTURE_ID || Boolean(await getIngestedWorkspace(workspaceId));
}
