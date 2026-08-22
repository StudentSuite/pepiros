import type { Evidence, GraphNode } from "@/types/anchor";

/**
 * Issue #294: "Claims citing this" runs the existing reverse-audit path
 * (POST /api/audit) over a source-pane text selection, which returns each
 * matched sentence's bestChunkId -- the chunk the selection itself best
 * matches (trivially the chunk it was selected from, but resolved through
 * the real verifier rather than assumed, so this still works once the
 * source pane can scroll across chunks the selection didn't start in).
 * This maps those chunk ids to the leaf nodes whose own evidence anchors
 * to one of them, in first-appearance order.
 */
export function leafNodesCitingChunks(
  leafNodes: GraphNode[],
  evidence: Evidence[],
  chunkIds: Set<string>,
): GraphNode[] {
  if (chunkIds.size === 0) return [];

  const nodeIdsWithMatch = new Set(
    evidence.filter((e) => e.anchor && chunkIds.has(e.anchor.chunkId)).map((e) => e.nodeId),
  );

  return leafNodes.filter((n) => nodeIdsWithMatch.has(n.id));
}
