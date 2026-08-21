import { describe, expect, it } from "vitest";
import type { Chunk, Evidence } from "@/types/anchor";
import { computePageCoverage } from "./coverage";

function chunk(id: string, page: number): Chunk {
  return { id, paperId: "p-1", sectionId: null, kind: "prose", page, text: "", ordinal: 0, rects: [] };
}

function evidence(overrides: Partial<Evidence> & Pick<Evidence, "id" | "nodeId">): Evidence {
  return {
    refId: "C1",
    anchor: null,
    tier: "quote_located",
    matchScore: 0.95,
    numericOk: null,
    ...overrides,
  };
}

describe("computePageCoverage", () => {
  it("lists every page in the paper, sorted, even with no evidence at all", () => {
    const chunks = [chunk("c1", 3), chunk("c2", 1), chunk("c3", 2)];
    const result = computePageCoverage(chunks, []);
    expect(result).toEqual([
      { page: 1, strongestTier: null },
      { page: 2, strongestTier: null },
      { page: 3, strongestTier: null },
    ]);
  });

  it("picks the strongest tier on a page, not the weakest (issue #245's optimistic rule)", () => {
    const chunks = [chunk("c1", 1), chunk("c2", 1)];
    const ev = [
      evidence({
        id: "e1",
        nodeId: "n1",
        tier: "paraphrase",
        anchor: { chunkId: "c1", quote: "q", spans: [] },
      }),
      evidence({
        id: "e2",
        nodeId: "n2",
        tier: "quote_located",
        anchor: { chunkId: "c2", quote: "q", spans: [] },
      }),
    ];
    const result = computePageCoverage(chunks, ev);
    expect(result).toEqual([{ page: 1, strongestTier: "quote_located" }]);
  });

  it("leaves a page hollow when its evidence is unsupported (no real anchor)", () => {
    const chunks = [chunk("c1", 1)];
    const ev = [evidence({ id: "e1", nodeId: "n1", tier: "unsupported", anchor: null })];
    expect(computePageCoverage(chunks, ev)).toEqual([{ page: 1, strongestTier: null }]);
  });

  it("ignores evidence anchored to a chunk outside this paper's chunk list", () => {
    const chunks = [chunk("c1", 1)];
    const ev = [
      evidence({
        id: "e1",
        nodeId: "n1",
        tier: "quote_located",
        anchor: { chunkId: "not-in-this-paper", quote: "q", spans: [] },
      }),
    ];
    expect(computePageCoverage(chunks, ev)).toEqual([{ page: 1, strongestTier: null }]);
  });
});
