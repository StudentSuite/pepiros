import type { Chunk, Evidence, EvidenceTier } from "@/types/anchor";

/**
 * Issue #245: coverage used to be a footer number ("2/3 chunks (67%)"); this
 * is the per-page data a thumbnail gutter renders from instead. Each page
 * gets its strongest evidence tier -- optimistic on purpose, unlike the
 * claims pane's per-claim "weakest tier" rule (issue #244): this answers "is
 * there anything solid on this page", not "what's the worst thing here".
 */
const TIER_RANK: Record<EvidenceTier, number> = { unsupported: 0, paraphrase: 1, quote_located: 2 };

export interface PageCoverage {
  page: number;
  /** null = no grounded evidence anchored to this page at all (hollow tick). */
  strongestTier: EvidenceTier | null;
}

export function computePageCoverage(chunks: Chunk[], evidence: Evidence[]): PageCoverage[] {
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const bestTierByPage = new Map<number, EvidenceTier>();

  for (const ev of evidence) {
    if (!ev.anchor || ev.tier === "unsupported") continue;
    const chunk = chunkById.get(ev.anchor.chunkId);
    if (!chunk) continue;
    const current = bestTierByPage.get(chunk.page);
    if (!current || TIER_RANK[ev.tier] > TIER_RANK[current]) {
      bestTierByPage.set(chunk.page, ev.tier);
    }
  }

  const pages = [...new Set(chunks.map((c) => c.page))].sort((a, b) => a - b);
  return pages.map((page) => ({ page, strongestTier: bestTierByPage.get(page) ?? null }));
}
