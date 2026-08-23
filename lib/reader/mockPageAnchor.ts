import type { Chunk } from "@/types/anchor";
import type { Highlight } from "@/components/reader/HighlightLayer";

/**
 * Approximates a standard 1in top margin (~9% of a 792pt page) -- see
 * anchorHighlightsToMockPage's own doc comment for what this corrects.
 */
export const MOCK_PAGE_TOP_MARGIN_PT = 72;

/**
 * Issue #323: a chunk's own rect.y0 is authored against where that text
 * really sits on a full, real page (e.g. 180pt down page 4, after whatever
 * sections precede it) -- but the reader's mock page fallback (PdfPane.tsx's
 * MockPdfPane, used whenever no real PDF binary is stored) only ever renders
 * that ONE chunk's isolated text, starting right at the container's own top
 * padding, nothing above it. A highlight positioned at the chunk's real-page
 * y0 then lands however far down a page that never actually renders in this
 * view, with empty paper in between -- confirmed live as a ~150px gap on the
 * bundled fixture's page 4.
 *
 * Re-anchors every span on the chunk's own page so it starts
 * MOCK_PAGE_TOP_MARGIN_PT down instead, matching where the mock's text
 * actually begins. A span on a different page passes through unchanged --
 * this function runs before HighlightLayer's own `page === chunk.page`
 * filter, so it must not shift a rect this chunk's baseline says nothing
 * about.
 */
export function anchorHighlightsToMockPage(chunk: Chunk, highlights: Highlight[]): Highlight[] {
  const chunkTop = Math.min(...chunk.rects.filter((r) => r.page === chunk.page).map((r) => r.y0));
  if (!Number.isFinite(chunkTop)) return highlights;

  return highlights.map((h) => ({
    ...h,
    spans: h.spans.map((s) =>
      s.page === chunk.page
        ? { ...s, y0: s.y0 - chunkTop + MOCK_PAGE_TOP_MARGIN_PT, y1: s.y1 - chunkTop + MOCK_PAGE_TOP_MARGIN_PT }
        : s,
    ),
  }));
}
