import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";

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
 */
export async function fetchWorkspace(_workspaceId: string): Promise<Workspace> {
  return workspaceFixture as unknown as Workspace;
}
