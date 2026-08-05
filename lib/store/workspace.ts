import { create } from "zustand";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";

/**
 * Single data-access seam for components/ and app/(app)/ pages this pass:
 * everything reads from the frozen fixture (plan.md §8), nothing calls
 * app/api/* or Supabase yet. `fetchWorkspace` is deliberately shaped like
 * the eventual real fetch (`Promise<Workspace>`) so swapping in a real
 * `GET /api/graph/[workspaceId]` call later is a one-function change, not a
 * rewrite of every consumer.
 */
export async function fetchWorkspace(_workspaceId: string): Promise<Workspace> {
  return workspaceFixture as unknown as Workspace;
}

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
