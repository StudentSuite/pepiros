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
}

export type PepirosNode = Node<PepirosNodeData, string>;

/** Data every custom edge component receives: its own GraphEdge plus the pillarIndex
 *  of both endpoints, resolved by GraphCanvas, so GraphEdge can decide whether to tint
 *  toward pillarColor() without doing its own node lookup. */
export interface PepirosEdgeData extends Record<string, unknown> {
  edge: GraphEdge;
  sourcePillarIndex: number | null;
  targetPillarIndex: number | null;
}

export type PepirosEdge = Edge<PepirosEdgeData, string>;

/** Ghost citation nodes (plan.md §6.2) aren't GraphNodes -- they represent a paper
 *  found via OpenAlex expansion that isn't in the workspace yet, so they carry a
 *  loose shape instead of a real node id/anchor. */
export interface GhostCitationData extends Record<string, unknown> {
  title: string;
  authors: string[];
  year: number | null;
  /** "cites" = this ghost paper cites something in the workspace; "cited_by" = the
   *  reverse direction. Purely cosmetic label this pass, no OpenAlex call wired up. */
  direction: "cites" | "cited_by";
}

export type GhostCitationNodeType = Node<GhostCitationData, "ghostCitation">;
