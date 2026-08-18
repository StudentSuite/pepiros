import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { computeLayout } from "@/lib/layout";
import { getIngestedWorkspace } from "./ingestStore";

/**
 * The single data-access seam. Everything that needs a workspace, on either
 * the HTTP surface (app/api/*) or the MCP one (mcp/server.ts), reads through
 * here, and this is the one function that changes when a real Supabase project
 * exists. It deliberately has the shape of the eventual real fetch.
 *
 * This lives in lib/services/ rather than lib/store/ because server routes
 * must not import the client zustand module to reach it: doing so pulls a
 * client-state container, and the whole fixture, into a server bundle.
 * lib/store/workspace.ts re-exports this for client consumers.
 *
 * Node x/y are recomputed here by lib/layout rather than taken from the
 * stored/fixture values (docs/PLAN-V1.md §9.1: "deterministic,
 * server-computed"). Doing it at the seam rather than in each consumer is
 * deliberate: the canvas reads through the client store while API and MCP
 * callers read this directly, so laying out in any one of those would leave
 * the others on stale hand-authored coordinates. computeLayout is a pure
 * function of the graph's shape, so every caller gets identical positions.
 *
 * A workspaceId that real ingest (lib/services/ingest.ts) has actually built
 * or added a paper to resolves to that workspace instead of the fixture --
 * still through this one seam, not a second data path. Every id that has
 * never been ingested into keeps today's behaviour exactly: the fixture,
 * regardless of the id passed in.
 */
export async function fetchWorkspace(workspaceId: string): Promise<Workspace> {
  const ingested = await getIngestedWorkspace(workspaceId);
  const workspace = ingested?.workspace ?? (workspaceFixture as unknown as Workspace);
  return { ...workspace, nodes: computeLayout(workspace) };
}
