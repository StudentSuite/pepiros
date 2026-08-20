"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkspaceStore } from "@/lib/store/workspace";
import { allPillarIds, hiddenLeafIds, leavesByPillar, visibleEdges } from "@/lib/graph/visibility";
import { detailLevelFor, LOD_TITLE_THRESHOLD } from "@/lib/graph/lod";
import { CanvasLegend } from "./CanvasLegend";
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
import { Skeleton } from "@/components/ui/Skeleton";
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

/** CanvasLegend's w-72 (288px) plus its left-4 offset and a gap to breathe. */
const LEGEND_RESERVED_PX = 320;

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
          pdfUrl: candidate.pdfUrl,
          workspaceId,
        },
      });
      // Edge id includes paperNode.id, not just ghostId: two different workspace
      // papers can both cite (or be cited by) the same external work, which
      // would otherwise collide on one id and silently drop one real edge
      // (found via a real duplicate-key warning in the browser, not a guess).
      const edgeId = `${paperNode.id}-${ghostId}-edge`;
      edges.push({
        id: edgeId,
        type: "graphEdge",
        source: direction === "cites" ? ghostId : paperNode.id,
        target: direction === "cites" ? paperNode.id : ghostId,
        data: {
          edge: { id: edgeId, workspaceId, kind: "cites", sourceId: "", targetId: "" },
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

interface BuildOptions {
  collapsedPillarIds: Set<string>;
  onToggleCollapse: (pillarId: string) => void;
  ghostPaperIds: Set<string>;
  loadingPaperIds: Set<string>;
  onToggleGhosts: (paperNodeId: string) => void;
}

function buildNodes(workspace: Workspace, options: BuildOptions): PepirosNode[] {
  const spanned = computeSpannedPapers(workspace);
  const pillarLeaves = leavesByPillar(workspace);
  const hidden = hiddenLeafIds(workspace, options.collapsedPillarIds);

  return workspace.nodes
    .filter((node) => !hidden.has(node.id))
    .map((node, index) => ({
      id: node.id,
      type: NODE_TYPE_MAP[node.type],
      position: { x: node.x, y: node.y },
      data: {
        node,
        evidence: workspace.evidence,
        spannedPapers: spanned.get(node.id),
        appearDelayMs: (index % 6) * 40,
        ...(node.type === "pillar"
          ? {
              leafCount: (pillarLeaves.get(node.id) ?? []).length,
              collapsed: options.collapsedPillarIds.has(node.id),
              onToggleCollapse: () => options.onToggleCollapse(node.id),
            }
          : {}),
        ...(node.type === "paper" && node.paperId
          ? {
              ghostsShown: options.ghostPaperIds.has(node.id),
              ghostsLoading: options.loadingPaperIds.has(node.id),
              onToggleGhosts: () => options.onToggleGhosts(node.id),
            }
          : {}),
      },
    }));
}

/**
 * Edges are filtered to those with both endpoints visible. That one rule does
 * all the edge decluttering: 15 of the fixture's 22 edges are `contains`
 * scaffolding, so collapsing a pillar removes its tree edges for free, with no
 * edge-specific collapse logic -- and it will do the same for ghost-citation
 * edges whenever their ghost nodes aren't shown.
 */
function buildEdges(workspace: Workspace, visibleNodeIds: Set<string>): PepirosEdge[] {
  const pillarByNodeId = new Map(workspace.nodes.map((n) => [n.id, n.pillarIndex]));
  const visible = visibleEdges(workspace, visibleNodeIds);
  // Dash-march is a workspace-wide decision, not a per-edge one (docs/PLAN-V1.md
  // §9.1: disable above 4 visible contradiction edges) -- counted once here rather
  // than each GraphEdge instance guessing at how many siblings exist. Counted over
  // *visible* edges, since that is what the spec's threshold is about.
  const dashMarchEnabled = visible.filter((e) => e.kind === "contradicts").length <= 4;
  return visible.map((edge) => ({
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

  // Zoom drives level-of-detail (lib/graph/lod.ts). Kept in React state rather
  // than read from the transform per node, so a pan does not re-render every
  // card -- only a zoom that actually crosses a threshold changes anything.
  const [zoom, setZoom] = useState(1);
  const detail = detailLevelFor(zoom);

  // The legend is an overlay ~290px wide in the bottom-left. Left alone it sat
  // on top of the graph, and on the bundled fixture it covered an entire paper
  // column. Re-fitting with more padding when it opens pulls the graph inward
  // so nothing ends up underneath it.
  const [legendOpen, setLegendOpen] = useState(false);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!workspace) return;
    // Directional px padding, not a uniform fraction: this graph is wider than
    // it is tall, so it is width-constrained, and a bigger uniform padding
    // just scales everything down while the leftmost column still lands under
    // the panel. Reserving the panel's actual width on the left is what
    // actually moves content out from under it.
    const id = requestAnimationFrame(() => {
      void fitView({
        padding: legendOpen
          ? { left: `${LEGEND_RESERVED_PX}px`, right: "24px", y: "24px" }
          : "12%",
        // Never fit below the band where titles still render (lib/graph/lod.ts).
        // Without this floor, reserving room for the legend zoomed a 3-paper
        // graph down into "minimal" -- so opening the key turned every card
        // into a blank block, which is the opposite of explaining the picture.
        // Anything that no longer fits is reachable by panning, which is the
        // normal way to read a canvas.
        minZoom: LOD_TITLE_THRESHOLD,
        duration: 320,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [legendOpen, workspace, fitView]);

  // All pillars start collapsed: the first thing a reader should see is the
  // shape of the argument, not every leaf's body at once (docs/PLAN-V1.md
  // §9.1's PillarNode state table). On the bundled 3-paper fixture this is the
  // difference between 20 nodes and 12.
  const [collapsedPillarIds, setCollapsedPillarIds] = useState<Set<string>>(new Set());
  // Ghost citations, keyed by the paper node that asked for them, so hiding one
  // paper's citations leaves another paper's alone.
  const [ghostsByPaper, setGhostsByPaper] = useState<
    Map<string, { nodes: GhostCitationNodeType[]; edges: PepirosEdge[] }>
  >(new Map());
  const [loadingPaperIds, setLoadingPaperIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!workspace) void loadWorkspace(workspaceId);
  }, [workspace, workspaceId, loadWorkspace]);

  // Seed the collapsed set once per workspace, then leave it to the user.
  useEffect(() => {
    if (!workspace) return;
    setCollapsedPillarIds(allPillarIds(workspace));
    setGhostsByPaper(new Map());
  }, [workspace]);

  const handleToggleCollapse = useCallback((pillarId: string) => {
    setCollapsedPillarIds((prev) => {
      const next = new Set(prev);
      if (next.has(pillarId)) next.delete(pillarId);
      else next.add(pillarId);
      return next;
    });
  }, []);

  /**
   * Citation expansion is user-triggered, not automatic (docs/PLAN-V1.md §6.2).
   * It used to fire for every paper on load, which meant ghost nodes always
   * cluttered the graph even though the only thing to do with one needs an
   * ingest pipeline that doesn't exist yet.
   */
  const handleToggleGhosts = useCallback(
    (paperNodeId: string) => {
      const paperNode = workspace?.nodes.find((n) => n.id === paperNodeId);
      if (!paperNode) return;

      let alreadyShown = false;
      setGhostsByPaper((prev) => {
        if (!prev.has(paperNodeId)) return prev;
        alreadyShown = true;
        const next = new Map(prev);
        next.delete(paperNodeId);
        return next;
      });
      if (alreadyShown) return;

      setLoadingPaperIds((prev) => new Set(prev).add(paperNodeId));
      void fetchGhostsForPaper(workspaceId, paperNode)
        .then((result) => {
          setGhostsByPaper((prev) => new Map(prev).set(paperNodeId, result));
        })
        .finally(() => {
          setLoadingPaperIds((prev) => {
            const next = new Set(prev);
            next.delete(paperNodeId);
            return next;
          });
        });
    },
    [workspace, workspaceId],
  );

  useEffect(() => {
    if (!workspace) return;

    const baseNodes = buildNodes(workspace, {
      collapsedPillarIds,
      onToggleCollapse: handleToggleCollapse,
      ghostPaperIds: new Set(ghostsByPaper.keys()),
      loadingPaperIds,
      onToggleGhosts: handleToggleGhosts,
    });

    // The same external paper can turn up for more than one workspace paper
    // (e.g. both cite a common source) -- dedupe by id so it renders as one
    // ghost node, not a duplicate-keyed stack. Edges stay one-per-source-paper
    // (see the edgeId comment in fetchGhostsForPaper), so every real citation
    // relationship still gets its own edge into that single shared node.
    const seenGhostIds = new Set<string>();
    const ghostNodes = [...ghostsByPaper.values()]
      .flatMap((g) => g.nodes)
      .filter((n) => {
        if (seenGhostIds.has(n.id)) return false;
        seenGhostIds.add(n.id);
        return true;
      });
    const ghostEdges = [...ghostsByPaper.values()].flatMap((g) => g.edges);

    const visibleIds = new Set<string>([
      ...baseNodes.map((n) => n.id),
      ...ghostNodes.map((n) => n.id),
    ]);

    setNodes([...baseNodes, ...ghostNodes]);
    setEdges([
      ...buildEdges(workspace, visibleIds),
      ...ghostEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    ]);
  }, [
    workspace,
    collapsedPillarIds,
    ghostsByPaper,
    loadingPaperIds,
    handleToggleCollapse,
    handleToggleGhosts,
    setNodes,
    setEdges,
  ]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  // React Flow makes each node focusable and handles Enter/Space itself, but
  // only to toggle its own internal selection visuals -- it never calls
  // onNodeClick from a keyboard event (issue #182). Delegating one keydown
  // listener here (rather than wiring onKeyDown into all 6 node components)
  // opens the same inspector a mouse click does, keyed off the `data-id`
  // React Flow already stamps onto each node's wrapper element.
  const handleCanvasKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const nodeEl = (event.target as HTMLElement).closest<HTMLElement>(".react-flow__node[data-id]");
      if (!nodeEl) return;
      const nodeId = nodeEl.dataset.id;
      if (!nodeId) return;
      event.preventDefault();
      selectNode(nodeId);
    },
    [selectNode],
  );

  if (!workspace) {
    // Skeleton graph, not a bare spinner (docs/PLAN-V1.md §14.5, §6): a
    // paper node with ghost pillars pulsing around it, in under 300ms, is
    // what makes the real fan-out feel fast once it starts.
    return (
      <div className="flex h-full w-full items-center justify-center" role="status" aria-label="Loading graph">
        <div className="relative h-64 w-64">
          <Skeleton className="absolute left-1/2 top-1/2 h-16 w-40 -translate-x-1/2 -translate-y-1/2 rounded-md" />
          {[0, 1, 2].map((i) => {
            const angle = (i / 3) * 2 * Math.PI - Math.PI / 2;
            return (
              <Skeleton
                key={i}
                className="absolute h-10 w-24 rounded"
                style={{
                  left: `calc(50% + ${Math.cos(angle) * 100}px - 3rem)`,
                  top: `calc(50% + ${Math.sin(angle) * 100}px - 1.25rem)`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* One-paper hint (docs/PLAN-V1.md §14.5) -- z-10 so it sits above the
          canvas but never blocks node clicks/drags underneath it. */}
      {workspace.papers.length === 1 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-border-strong bg-surface-raised px-3 py-1.5 font-sans text-xs text-ink-muted shadow-e-2">
          Add a second paper to unlock cross-paper analysis.
        </div>
      )}
      {/* Level-of-detail is applied as one attribute here rather than as a
          prop on every node: it affects all cards identically, so a CSS rule
          on an ancestor beats rebuilding 20+ node objects on every zoom. */}
      <div className="h-full w-full" data-canvas-detail={detail} onKeyDown={handleCanvasKeyDown}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodeClick={handleNodeClick}
          onPaneClick={() => selectNode(null)}
          onMove={(_, viewport) => setZoom(viewport.zoom)}
          fitView
          minZoom={0.2}
          maxZoom={2}
          className="bg-surface"
        >
          {/* No <MiniMap/> -- explicitly cut (plan.md §11). Custom themed Controls only. */}
          <Background color="var(--border)" gap={24} />
          <Controls />
        </ReactFlow>
      </div>
      <CanvasLegend workspace={workspace} open={legendOpen} onOpenChange={setLegendOpen} />
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
