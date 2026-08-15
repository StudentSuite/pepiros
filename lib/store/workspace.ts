import { create } from "zustand";
import type { Evidence, GraphNode, Workspace } from "@/types/anchor";

/**
 * Client-side store for components/ and app/(app)/ pages.
 *
 * loadWorkspace() fetches GET /api/workspace/[workspaceId] rather than
 * calling lib/services/workspace.ts's fetchWorkspace() directly the way
 * this file used to. That direct call only ever worked because
 * fetchWorkspace() used to just read the static fixture -- safe to run in
 * the browser. Now that it also has to check lib/services/ingestStore.ts
 * for a real ingested workspace, calling it from client code breaks the
 * production build outright (that module's `import "server-only"` isn't
 * satisfiable in a client bundle) and, worked around, would still silently
 * never see a real ingested workspace anyway: that store is server-process
 * memory, unreachable from a browser bundle. Routing through the API route
 * means the client gets the same seam every server-side reader already
 * uses.
 */
interface WorkspaceState {
  workspace: Workspace | null;
  selectedNodeId: string | null;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  /**
   * Appends a node created through the MCP `create_node` path (chat's
   * Promote button, POST /api/nodes) to the in-memory workspace so it
   * renders immediately -- there is no live Postgres to persist it to yet
   * (CLAUDE.md's current data seam), so this is optimistic client state,
   * not a durable write.
   */
  addNode: (node: GraphNode, evidence: Evidence[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  selectedNodeId: null,
  loadWorkspace: async (workspaceId) => {
    const res = await fetch(`/api/workspace/${encodeURIComponent(workspaceId)}`);
    if (!res.ok) throw new Error(`Could not load workspace ${workspaceId} (${res.status}).`);
    const workspace = (await res.json()) as Workspace;
    set({ workspace });
  },
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  addNode: (node, evidence) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          nodes: [...state.workspace.nodes, node],
          evidence: [...state.workspace.evidence, ...evidence],
        },
      };
    }),
}));
