import { describe, expect, it } from "vitest";
import type { Chunk } from "@/types/anchor";
import type { Highlight } from "@/components/reader/HighlightLayer";
import { anchorHighlightsToMockPage, MOCK_PAGE_TOP_MARGIN_PT } from "./mockPageAnchor";

function chunkOn(page: number, y0: number, y1: number): Chunk {
  return {
    id: "c1",
    paperId: "p1",
    sectionId: null,
    kind: "prose",
    page,
    text: "Some real-page-authored sentence.",
    ordinal: 1,
    rects: [{ page, x0: 72, y0, x1: 520, y1 }],
  };
}

function highlightOn(page: number, y0: number, y1: number): Highlight {
  return {
    id: "e1",
    nodeId: "n1",
    tier: "quote_located",
    spans: [{ page, x0: 72, y0, x1: 520, y1 }],
  };
}

describe("anchorHighlightsToMockPage", () => {
  it("re-anchors a span that spans its whole chunk to start at the top margin", () => {
    // The exact bundled-fixture shape this issue was found on: the evidence
    // span equals the chunk's own rect (a whole-chunk quote), authored
    // ~180pt down a real page 4.
    const chunk = chunkOn(4, 180, 214);
    const highlights = [highlightOn(4, 180, 214)];

    const [result] = anchorHighlightsToMockPage(chunk, highlights);

    expect(result!.spans[0]!.y0).toBe(MOCK_PAGE_TOP_MARGIN_PT);
    // Height (y1 - y0 = 34pt) is preserved, only the offset moves.
    expect(result!.spans[0]!.y1).toBe(MOCK_PAGE_TOP_MARGIN_PT + 34);
  });

  it("preserves a sub-span's offset within the chunk, not just the chunk's own top", () => {
    // A quote starting partway into a longer chunk (chunk spans 300-400,
    // the quote itself only 340-360) should land 40pt past the margin, not
    // right at it -- otherwise every sub-span would clump onto one line.
    const chunk = chunkOn(6, 300, 400);
    const highlights = [highlightOn(6, 340, 360)];

    const [result] = anchorHighlightsToMockPage(chunk, highlights);

    expect(result!.spans[0]!.y0).toBe(MOCK_PAGE_TOP_MARGIN_PT + 40);
    expect(result!.spans[0]!.y1).toBe(MOCK_PAGE_TOP_MARGIN_PT + 60);
  });

  it("leaves a span on a different page untouched", () => {
    const chunk = chunkOn(4, 180, 214);
    const otherPageSpan = highlightOn(5, 300, 328);

    const [result] = anchorHighlightsToMockPage(chunk, [otherPageSpan]);

    expect(result!.spans[0]).toEqual(otherPageSpan.spans[0]);
  });

  it("is a no-op when the chunk has no rects on its own page", () => {
    const chunk: Chunk = { ...chunkOn(4, 180, 214), rects: [] };
    const highlights = [highlightOn(4, 180, 214)];

    expect(anchorHighlightsToMockPage(chunk, highlights)).toEqual(highlights);
  });
});
