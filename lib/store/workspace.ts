import { create } from "zustand";
import type { Evidence, GraphNode, Workspace } from "@/types/anchor";
import { fetchWorkspace } from "@/lib/services/workspace";

/**
 * Client-side store for components/ and app/(app)/ pages. The read itself
 * lives in lib/services/workspace.ts so that server routes can reach it
 * without importing this zustand module; this file only re-exports it for
 * client consumers that already import from here.
 */
export { fetchWorkspace };

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
    const workspace = await fetchWorkspace(workspaceId);
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
