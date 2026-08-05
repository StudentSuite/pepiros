import { create } from "zustand";
import type { Workspace } from "@/types/anchor";
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
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  selectedNodeId: null,
  loadWorkspace: async (workspaceId) => {
    const workspace = await fetchWorkspace(workspaceId);
    set({ workspace });
  },
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
}));
