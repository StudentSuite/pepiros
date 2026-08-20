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
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const ingested = await listIngestedWorkspaces();
  const summaries: WorkspaceSummary[] = [...ingested];
  if (!ingested.some((w) => w.id === FIXTURE_ID)) {
    summaries.unshift(summarize(workspaceFixture as unknown as Workspace));
  }
  return summaries;
}

export async function createWorkspace(name: string): Promise<WorkspaceSummary> {
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
  await setIngestedWorkspace(workspace);
  return summarize(workspace);
}

export async function workspaceExists(workspaceId: string): Promise<boolean> {
  return workspaceId === FIXTURE_ID || Boolean(await getIngestedWorkspace(workspaceId));
}
