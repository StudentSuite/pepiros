"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkspaceStore } from "@/lib/store/workspace";
import type { GraphNode, Workspace } from "@/types/anchor";
import { PaperNode } from "./PaperNode";
import { PillarNode } from "./PillarNode";
import { LeafNode } from "./LeafNode";
import { ThreadNode } from "./ThreadNode";
import { SynthesisNode } from "./SynthesisNode";
import { GhostCitationNode } from "./GhostCitationNode";
import { GraphEdge } from "./GraphEdge";
import { Controls } from "./Controls";
import type { PepirosNode, PepirosEdge } from "./types";

const NODE_TYPES = {
  paperNode: PaperNode,
  pillarNode: PillarNode,
  leafNode: LeafNode,
  threadNode: ThreadNode,
  synthesisNode: SynthesisNode,
  // Registered but not spawned from workspace data this pass -- no OpenAlex citation
  // expansion is wired up yet (plan.md §6.2). The component exists so wiring it up
  // later is additive, not a rewrite.
  ghostCitation: GhostCitationNode,
} as const;

const EDGE_TYPES = { graphEdge: GraphEdge } as const;

const NODE_TYPE_MAP: Record<GraphNode["type"], keyof typeof NODE_TYPES> = {
  paper: "paperNode",
  pillar: "pillarNode",
  leaf: "leafNode",
  thread: "threadNode",
  synthesis: "synthesisNode",
};

/** Which papers a cross-paper node (synthesis/thread) reaches into, derived from its
 *  outgoing `derived_from`/`relates` edges -- used only for the small avatar list on
 *  those two node types (see SynthesisNode/ThreadNode + types.ts's `spannedPapers`). */
function computeSpannedPapers(workspace: Workspace): Map<string, { id: string; label: string }[]> {
  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n]));
  const spanned = new Map<string, { id: string; label: string }[]>();

  for (const edge of workspace.edges) {
    if (edge.kind !== "derived_from" && edge.kind !== "relates") continue;
    const source = nodeById.get(edge.sourceId);
    if (!source || (source.type !== "synthesis" && source.type !== "thread")) continue;
    const target = nodeById.get(edge.targetId);
    if (!target?.paperId) continue;

    const list = spanned.get(source.id) ?? [];
    if (!list.some((p) => p.id === target.paperId)) {
      list.push({ id: target.paperId, label: target.paperId.toUpperCase() });
    }
    spanned.set(source.id, list);
  }
  return spanned;
}

function buildNodes(workspace: Workspace): PepirosNode[] {
  const spanned = computeSpannedPapers(workspace);
  return workspace.nodes.map((node) => ({
    id: node.id,
    type: NODE_TYPE_MAP[node.type],
    position: { x: node.x, y: node.y },
    data: {
      node,
      evidence: workspace.evidence,
      spannedPapers: spanned.get(node.id),
    },
  }));
}

function buildEdges(workspace: Workspace): PepirosEdge[] {
  const pillarByNodeId = new Map(workspace.nodes.map((n) => [n.id, n.pillarIndex]));
  return workspace.edges.map((edge) => ({
    id: edge.id,
    type: "graphEdge",
    source: edge.sourceId,
    target: edge.targetId,
    data: {
      edge,
      sourcePillarIndex: pillarByNodeId.get(edge.sourceId) ?? null,
      targetPillarIndex: pillarByNodeId.get(edge.targetId) ?? null,
    },
  }));
}

function GraphCanvasInner({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  const [nodes, setNodes, onNodesChange] = useNodesState<PepirosNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PepirosEdge>([]);

  useEffect(() => {
    if (!workspace) void loadWorkspace(workspaceId);
  }, [workspace, workspaceId, loadWorkspace]);

  useEffect(() => {
    if (!workspace) return;
    setNodes(buildNodes(workspace));
    setEdges(buildEdges(workspace));
  }, [workspace, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  if (!workspace) {
    return (
      <div className="flex h-full w-full items-center justify-center font-sans text-sm text-ink-faint">
        Loading graph…
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodeClick={handleNodeClick}
      onPaneClick={() => selectNode(null)}
      fitView
      minZoom={0.2}
      maxZoom={2}
      className="bg-surface"
    >
      {/* No <MiniMap/> -- explicitly cut (plan.md §11). Custom themed Controls only. */}
      <Background color="var(--border)" gap={24} />
      <Controls />
    </ReactFlow>
  );
}

/**
 * Top-level canvas entry point. Loads the workspace from the store on mount,
 * converts it into React Flow's Node[]/Edge[] shape, and registers the custom
 * node/edge types. Wrapped in ReactFlowProvider so `useReactFlow` works inside
 * `Controls` (plan.md's canvas spec, task 5).
 */
export function GraphCanvas({ workspaceId }: { workspaceId: string }) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}
