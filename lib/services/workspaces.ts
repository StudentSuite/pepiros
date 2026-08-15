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
 */
export function listWorkspaces(): WorkspaceSummary[] {
  const ingested = listIngestedWorkspaces();
  const summaries = ingested.map(summarize);
  if (!ingested.some((w) => w.id === FIXTURE_ID)) {
    summaries.unshift(summarize(workspaceFixture as unknown as Workspace));
  }
  return summaries;
}

export function createWorkspace(name: string): WorkspaceSummary {
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
  setIngestedWorkspace(workspace);
  return summarize(workspace);
}

export function workspaceExists(workspaceId: string): boolean {
  return workspaceId === FIXTURE_ID || Boolean(getIngestedWorkspace(workspaceId));
}
