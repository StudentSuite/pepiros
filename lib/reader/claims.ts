import type { Chunk, Evidence, EvidenceTier, GraphNode } from "@/types/anchor";
import { resolveInlineRefs } from "@/components/canvas/InlineRefs";

/**
 * Same pessimistic rule as components/canvas/LeafNode.tsx: a claim citing
 * several evidence rows surfaces its shakiest grounding, not its strongest.
 * Duplicated rather than imported from there because that file also carries
 * canvas-only concerns (pillar colour, React Flow handles); this is the pure
 * piece worth its own test coverage (CLAUDE.md: pure logic belongs in lib/).
 */
const TIER_RANK: Record<EvidenceTier, number> = { unsupported: 0, paraphrase: 1, quote_located: 2 };

export interface ClaimSummary {
  node: GraphNode;
  /** The evidence row driving the badge below -- the weakest one this claim cites, if any. */
  weakestEvidence: Evidence | null;
  weakestTier: EvidenceTier | null;
  /** Page the weakest evidence row's quote was located on; null when it has no anchor. */
  page: number | null;
}

export function buildClaimSummaries(
  leafNodes: GraphNode[],
  evidence: Evidence[],
  chunks: Chunk[],
): ClaimSummary[] {
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  return leafNodes.map((node) => {
    const refs = resolveInlineRefs(node.bodyMd, evidence);
    const weakestEvidence = refs.reduce<Evidence | null>(
      (acc, ev) => (acc === null || TIER_RANK[ev.tier] < TIER_RANK[acc.tier] ? ev : acc),
      null,
    );
    const page = weakestEvidence?.anchor ? (chunkById.get(weakestEvidence.anchor.chunkId)?.page ?? null) : null;

    return { node, weakestEvidence, weakestTier: weakestEvidence?.tier ?? null, page };
  });
}

export type ClaimSortOrder = "weakest" | "page" | "pillar";

/**
 * "Weakest first" is the default (issue #244): a reader auditing a paper's
 * grounding should see its shakiest claims without hunting, matching the
 * same pessimism the canvas card badge already applies per-claim. Ties break
 * on match score ascending (still weakest-first within a tier), then on the
 * original (pillar-plan) order for full determinism.
 */
export function sortClaims(summaries: ClaimSummary[], order: ClaimSortOrder): ClaimSummary[] {
  const indexed = summaries.map((s, i) => ({ s, i }));

  indexed.sort((a, b) => {
    if (order === "weakest") {
      const rankA = a.s.weakestTier ? TIER_RANK[a.s.weakestTier] : -1;
      const rankB = b.s.weakestTier ? TIER_RANK[b.s.weakestTier] : -1;
      if (rankA !== rankB) return rankA - rankB;
      const scoreA = a.s.weakestEvidence?.matchScore ?? -1;
      const scoreB = b.s.weakestEvidence?.matchScore ?? -1;
      if (scoreA !== scoreB) return scoreA - scoreB;
    } else if (order === "page") {
      const pageA = a.s.page ?? Number.POSITIVE_INFINITY;
      const pageB = b.s.page ?? Number.POSITIVE_INFINITY;
      if (pageA !== pageB) return pageA - pageB;
    } else {
      const pillarA = a.s.node.pillarIndex ?? Number.POSITIVE_INFINITY;
      const pillarB = b.s.node.pillarIndex ?? Number.POSITIVE_INFINITY;
      if (pillarA !== pillarB) return pillarA - pillarB;
    }
    return a.i - b.i;
  });

  return indexed.map(({ s }) => s);
}
