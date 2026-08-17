import { create } from "zustand";
import type { Evidence, GraphEdge, GraphNode, Workspace } from "@/types/anchor";

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
  /** Set when the most recent loadWorkspace() call failed; cleared on the next attempt. */
  loadError: string | null;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  /**
   * Appends a node created through the MCP `create_node` path (chat's
   * Promote button, POST /api/nodes; a followup chip's POST /api/nodes/[id]/
   * expand, which also carries a derived_from edge) to the in-memory
   * workspace so it renders immediately -- there is no live Postgres to
   * persist it to yet (CLAUDE.md's current data seam), so this is optimistic
   * client state, not a durable write.
   */
  addNode: (node: GraphNode, evidence: Evidence[], edges?: GraphEdge[]) => void;
  /**
   * Applies a successfully-persisted body edit (PATCH /api/nodes/[id]) to
   * the in-memory workspace so the drawer reflects it without a full
   * reload. Takes the server's response `evidence` (issue #77: an edit
   * re-verifies every evidence row already on this node and may downgrade
   * or drop one) rather than leaving the old rows in place, so a badge that
   * the server just demoted doesn't keep showing the stale tier.
   */
  updateNodeBody: (nodeId: string, bodyMd: string, evidence: Evidence[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  selectedNodeId: null,
  loadError: null,
  loadWorkspace: async (workspaceId) => {
    // Every call site fires this from a useEffect as `void loadWorkspace(...)`
    // (or bare, uncaught) -- none of them are prepared to catch a rejection,
    // since the old direct in-process call could never actually fail. Caught
    // here rather than left to become an unhandled rejection in each of them.
    set({ loadError: null });
    try {
      const res = await fetch(`/api/workspace/${encodeURIComponent(workspaceId)}`);
      if (!res.ok) throw new Error(`Could not load workspace ${workspaceId} (${res.status}).`);
      const workspace = (await res.json()) as Workspace;
      set({ workspace });
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : "Could not load workspace." });
    }
  },
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  addNode: (node, evidence, edges = []) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          nodes: [...state.workspace.nodes, node],
          edges: [...state.workspace.edges, ...edges],
          evidence: [...state.workspace.evidence, ...evidence],
        },
      };
    }),
  updateNodeBody: (nodeId, bodyMd, evidence) =>
    set((state) => {
      if (!state.workspace) return state;
      const evidenceById = new Map(evidence.map((e) => [e.id, e]));
      return {
        workspace: {
          ...state.workspace,
          nodes: state.workspace.nodes.map((n) => (n.id === nodeId ? { ...n, bodyMd } : n)),
          evidence: state.workspace.evidence.map((e) => evidenceById.get(e.id) ?? e),
        },
      };
    }),
}));
