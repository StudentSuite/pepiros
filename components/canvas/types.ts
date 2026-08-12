// Shared React Flow node/edge data shapes for the canvas layer (components/ owns this,
// per plan.md §8 -- not part of the frozen types/anchor.ts contract, just plumbing on
// top of it so each custom node/edge file doesn't redefine the same shape).
import type { Node, Edge } from "@xyflow/react";
import type { GraphNode, GraphEdge, Evidence } from "@/types/anchor";

/** Data every custom node component receives: its own GraphNode plus the workspace's
 *  full evidence list (small -- ~11 rows in the fixture) so nodes can resolve their
 *  own inline `[^eN]` markers without a second store lookup. */
export interface PepirosNodeData extends Record<string, unknown> {
  node: GraphNode;
  evidence: Evidence[];
  /** Papers this node's edges reach into another paper's subtree for (synthesis/thread
   *  nodes only -- they have no paperId of their own). Resolved by GraphCanvas from
   *  `derived_from`/`relates` edges so node components don't need the full edge list. */
  spannedPapers?: { id: string; label: string }[];
  /** node-appear stagger (docs/PLAN-V1.md §14.3: 40ms per sibling), cycled every
   *  6 so a large graph doesn't cascade for seconds. Resolved by GraphCanvas. */
  appearDelayMs?: number;
  /** Pillar nodes only: how many leaves this pillar contains, and whether they're
   *  currently hidden. Resolved by GraphCanvas from `contains` edges so the node
   *  can show a child-count pill without walking the edge list itself. */
  leafCount?: number;
  collapsed?: boolean;
  /** Pillar nodes only: toggles this pillar's leaves. Absent means non-interactive. */
  onToggleCollapse?: () => void;
  /** Paper nodes only: on-demand OpenAlex citation expansion (docs/PLAN-V1.md §6.2).
   *  Gated behind this rather than auto-fired, so ghost nodes -- whose one action
   *  needs an ingest pipeline that doesn't exist -- never clutter the graph unasked. */
  ghostsShown?: boolean;
  ghostsLoading?: boolean;
  onToggleGhosts?: () => void;
}

export type PepirosNode = Node<PepirosNodeData, string>;

/** Data every custom edge component receives: its own GraphEdge plus the pillarIndex
 *  of both endpoints, resolved by GraphCanvas, so GraphEdge can decide whether to tint
 *  toward pillarColor() without doing its own node lookup. */
export interface PepirosEdgeData extends Record<string, unknown> {
  edge: GraphEdge;
  sourcePillarIndex: number | null;
  targetPillarIndex: number | null;
  /** Dash-march animates contradiction edges (docs/PLAN-V1.md §9.1), but
   *  disabled above 4 visible such edges -- resolved once by GraphCanvas
   *  across the whole workspace, not per edge. */
  dashMarchEnabled: boolean;
}

export type PepirosEdge = Edge<PepirosEdgeData, string>;

/** Ghost citation nodes (plan.md §6.2) aren't GraphNodes -- they represent a paper
 *  found via OpenAlex expansion (lib/services/citationExpand.ts) that isn't in the
 *  workspace yet, so they carry a loose shape instead of a real node id/anchor. */
export interface GhostCitationData extends Record<string, unknown> {
  title: string;
  authors: string[];
  year: number | null;
  /** "cites" = this ghost paper cites the workspace paper it's attached to;
   *  "cited_by" = the reverse direction. Drives both the edge direction and the label. */
  direction: "cites" | "cited_by";
  openalexId: string;
  url: string;
}

export type GhostCitationNodeType = Node<GhostCitationData, "ghostCitation">;
