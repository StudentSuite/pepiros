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
import type { CitationExpansionResult, CitationDirection } from "@/lib/services/citationExpand";
import { PaperNode } from "./PaperNode";
import { PillarNode } from "./PillarNode";
import { LeafNode } from "./LeafNode";
import { ThreadNode } from "./ThreadNode";
import { SynthesisNode } from "./SynthesisNode";
import { GhostCitationNode } from "./GhostCitationNode";
import { GraphEdge } from "./GraphEdge";
import { Controls } from "./Controls";
import { Drawer } from "@/components/ui/Drawer";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import type { PepirosNode, PepirosEdge, GhostCitationNodeType } from "./types";

type AnyPepirosNode = PepirosNode | GhostCitationNodeType;

const NODE_TYPES = {
  paperNode: PaperNode,
  pillarNode: PillarNode,
  leafNode: LeafNode,
  threadNode: ThreadNode,
  synthesisNode: SynthesisNode,
  ghostCitation: GhostCitationNode,
} as const;

const GHOST_DIRECTIONS: CitationDirection[] = ["cites", "cited_by"];
const GHOST_X_OFFSET = 260;
const GHOST_Y_STEP = 110;
const GHOST_Y_START = 160;

/**
 * One fetch per (paper, direction) against GET /api/expand (lib/services/citationExpand.ts
 * -> OpenAlex). Runs after the workspace loads and only ever appends to node/edge state --
 * see the calling effect for why that's safe without a ghost-specific state slice.
 */
async function fetchGhostsForPaper(
  workspaceId: string,
  paperNode: GraphNode,
): Promise<{ nodes: GhostCitationNodeType[]; edges: PepirosEdge[] }> {
  if (!paperNode.paperId) return { nodes: [], edges: [] };

  const results = await Promise.all(
    GHOST_DIRECTIONS.map(async (direction) => {
      const res = await fetch(
        `/api/expand?workspaceId=${encodeURIComponent(workspaceId)}&paperId=${encodeURIComponent(paperNode.paperId!)}&direction=${direction}`,
      );
      const result = (await res.json()) as CitationExpansionResult;
      return { direction, result };
    }),
  );

  const nodes: GhostCitationNodeType[] = [];
  const edges: PepirosEdge[] = [];

  for (const { direction, result } of results) {
    if (result.status !== "ok") continue;
    // "cites" nodes read as upstream influence (placed left/above); "cited_by" as
    // downstream reach (placed right/above) -- both sit above the paper cluster,
    // at the canvas edge, per plan.md §6.2.
    const xOffset = direction === "cites" ? -GHOST_X_OFFSET : GHOST_X_OFFSET;

    result.candidates.forEach((candidate, i) => {
      const ghostId = `ghost-${candidate.openalexId}`;
      nodes.push({
        id: ghostId,
        type: "ghostCitation",
        position: { x: paperNode.x + xOffset, y: paperNode.y - GHOST_Y_START - i * GHOST_Y_STEP },
        data: {
          title: candidate.title,
          authors: candidate.authors,
          year: candidate.year,
          direction,
          openalexId: candidate.openalexId,
          url: candidate.url,
        },
      });
      edges.push({
        id: `${ghostId}-edge`,
        type: "graphEdge",
        source: direction === "cites" ? ghostId : paperNode.id,
        target: direction === "cites" ? paperNode.id : ghostId,
        data: {
          edge: { id: `${ghostId}-edge`, workspaceId, kind: "cites", sourceId: "", targetId: "" },
          sourcePillarIndex: null,
          targetPillarIndex: null,
          // Always "cites" above, never "contradicts" -- dash-march never applies.
          dashMarchEnabled: false,
        },
      });
    });
  }

  return { nodes, edges };
}

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
  return workspace.nodes.map((node, index) => ({
    id: node.id,
    type: NODE_TYPE_MAP[node.type],
    position: { x: node.x, y: node.y },
    data: {
      node,
      evidence: workspace.evidence,
      spannedPapers: spanned.get(node.id),
      appearDelayMs: (index % 6) * 40,
    },
  }));
}

function buildEdges(workspace: Workspace): PepirosEdge[] {
  const pillarByNodeId = new Map(workspace.nodes.map((n) => [n.id, n.pillarIndex]));
  // Dash-march is a workspace-wide decision, not a per-edge one (docs/PLAN-V1.md
  // §9.1: disable above 4 visible contradiction edges) -- counted once here rather
  // than each GraphEdge instance guessing at how many siblings exist.
  const contradictsCount = workspace.edges.filter((e) => e.kind === "contradicts").length;
  const dashMarchEnabled = contradictsCount <= 4;
  return workspace.edges.map((edge) => ({
    id: edge.id,
    type: "graphEdge",
    source: edge.sourceId,
    target: edge.targetId,
    data: {
      edge,
      sourcePillarIndex: pillarByNodeId.get(edge.sourceId) ?? null,
      targetPillarIndex: pillarByNodeId.get(edge.targetId) ?? null,
      dashMarchEnabled,
    },
  }));
}

function GraphCanvasInner({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);

  const [nodes, setNodes, onNodesChange] = useNodesState<AnyPepirosNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<PepirosEdge>([]);

  useEffect(() => {
    if (!workspace) void loadWorkspace(workspaceId);
  }, [workspace, workspaceId, loadWorkspace]);

  useEffect(() => {
    if (!workspace) return;
    setNodes(buildNodes(workspace));
    setEdges(buildEdges(workspace));
  }, [workspace, setNodes, setEdges]);

  // Ghost citation expansion (plan.md §6.2): fires once per paper after the base
  // graph is in place and only appends -- the effect above never re-triggers once
  // `workspace` has loaded, so it won't clobber these. Errors per-paper are
  // swallowed (Promise.all inside fetchGhostsForPaper already reduces failures to
  // status: "error"/"rate_limited", which just yields no candidates for that paper).
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    const paperNodes = workspace.nodes.filter((n) => n.type === "paper");

    void Promise.all(paperNodes.map((paperNode) => fetchGhostsForPaper(workspaceId, paperNode))).then(
      (results) => {
        if (cancelled) return;
        const newNodes = results.flatMap((r) => r.nodes);
        const newEdges = results.flatMap((r) => r.edges);
        if (newNodes.length) setNodes((prev) => [...prev, ...newNodes]);
        if (newEdges.length) setEdges((prev) => [...prev, ...newEdges]);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [workspace, workspaceId, setNodes, setEdges]);

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
    <>
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
      {/* Canvas is full-bleed (unlike the reader's static split-view inspector
          panel, PLAN-V1.md §9.3), so a selected node needs an overlay, not a
          pushed column -- the shared Drawer primitive from Stage B. */}
      <Drawer open={selectedNodeId !== null} onClose={() => selectNode(null)}>
        <NodeInspector />
      </Drawer>
    </>
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
