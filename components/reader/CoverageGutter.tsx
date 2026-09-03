"use client";

import clsx from "clsx";
import { computePageCoverage } from "@/lib/reader/coverage";
import type { Chunk, Evidence, EvidenceTier } from "@/types/anchor";

// computePageCoverage never actually assigns "unsupported" (it only ranks
// quote_located/paraphrase anchors, per the pure logic's own filter), but
// the field's type is the full EvidenceTier -- Partial keeps that honest
// rather than casting it away.
const TIER_CLASS: Partial<Record<EvidenceTier, string>> = {
  quote_located: "border-solid border-located/70 bg-located/25",
  paraphrase: "border-dashed border-paraphrase/70 bg-paraphrase/20",
};

/**
 * Issue #245: coverage used to be a footer strip reading "2/3 chunks (67%)",
 * which sat below the page and, on narrow viewports, clipped behind the chat
 * dock -- and a single percentage says nothing about *which* pages are
 * covered. This is a thumbnail-shaped gutter down the edge of the source
 * pane instead: one tick per page, coloured by that page's strongest
 * evidence tier, hollow where nothing covers it. Uncovered stretches are
 * visible on purpose -- that's the honest thing to show.
 */
export function CoverageGutter({
  chunks,
  evidence,
  activePage,
  onSelectPage,
}: {
  chunks: Chunk[];
  evidence: Evidence[];
  activePage: number | null;
  onSelectPage: (page: number) => void;
}) {
  const pages = computePageCoverage(chunks, evidence);
  if (pages.length === 0) return null;

  return (
    <nav
      aria-label="Page coverage"
      className="flex w-8 shrink-0 flex-col items-center gap-1 overflow-y-auto py-1"
    >
      {pages.map(({ page, strongestTier }) => (
        <button
          key={page}
          type="button"
          onClick={() => onSelectPage(page)}
          title={`Page ${page}${strongestTier ? ` -- strongest evidence: ${strongestTier.replace("_", " ")}` : " -- no grounded evidence"}`}
          aria-current={page === activePage ? "true" : undefined}
          className={clsx(
            "flex h-4 w-6 shrink-0 items-center justify-center rounded-[3px] border-2 font-mono text-2xs transition-colors duration-fast ease-out",
            strongestTier && TIER_CLASS[strongestTier]
              ? TIER_CLASS[strongestTier]
              : "border-dashed border-border bg-surface-sunken text-ink-faint",
            page === activePage && "ring-1 ring-accent ring-offset-1 ring-offset-surface",
          )}
        >
          {page}
        </button>
      ))}
    </nav>
  );
}
