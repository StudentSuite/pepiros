import { describe, expect, it } from "vitest";
import type { Chunk, Numeric } from "@/types/anchor";
import { buildRefIndex } from "./anchor";

function chunk(id: string, ordinal: number, paperId = "p1"): Chunk {
  return {
    id,
    paperId,
    sectionId: null,
    kind: "prose",
    page: 1,
    text: `text of ${id}`,
    ordinal,
    rects: [{ page: 1, x0: 0, y0: 0, x1: 10, y1: 10 }],
  };
}

function numeric(id: string, chunkId: string, ordinal: number): Numeric {
  return {
    id,
    chunkId,
    rawText: "34%",
    value: 34,
    unit: "%",
    comparator: "=",
    role: "effect_size",
    ordinal,
  };
}

describe("buildRefIndex", () => {
  it("keys chunks and numerics off their persisted ordinal", () => {
    const chunks = [chunk("c-a", 1), chunk("c-b", 2)];
    const numerics = [numeric("n-a", "c-b", 1)];
    const index = buildRefIndex(chunks, numerics);

    expect(index.get("C1")?.chunk.id).toBe("c-a");
    expect(index.get("C2")?.chunk.id).toBe("c-b");
    expect(index.get("N1")?.numeric?.id).toBe("n-a");
  });

  // plan.md §2 chose stable citation ids over embeddings. Evidence rows store
  // the rendered ref, so if an id were positional, ingesting a second paper
  // would silently re-point every already-written citation at different text.
  it("does not re-point an existing ref when another paper is added", () => {
    const first = [chunk("c-a", 1), chunk("c-b", 2)];
    const before = buildRefIndex(first, []);

    const withSecondPaper = [
      chunk("c-p2-a", 3, "p2"),
      ...first,
      chunk("c-p2-b", 4, "p2"),
    ];
    const after = buildRefIndex(withSecondPaper, []);

    expect(after.get("C1")?.chunk.id).toBe(before.get("C1")?.chunk.id);
    expect(after.get("C2")?.chunk.id).toBe(before.get("C2")?.chunk.id);
    expect(after.get("C3")?.chunk.id).toBe("c-p2-a");
  });

  it("carries every numeric on the resolved chunk, not just the cited row", () => {
    const chunks = [chunk("c-a", 1)];
    const numerics = [numeric("n-a", "c-a", 1), numeric("n-b", "c-a", 2)];
    const index = buildRefIndex(chunks, numerics);

    expect(index.get("C1")?.chunkNumerics).toHaveLength(2);
    expect(index.get("N1")?.chunkNumerics).toHaveLength(2);
  });

  it("skips a numeric whose chunk is missing rather than throwing", () => {
    const index = buildRefIndex([chunk("c-a", 1)], [numeric("n-orphan", "c-gone", 1)]);
    expect(index.get("N1")).toBeUndefined();
    expect(index.get("C1")).toBeDefined();
  });
});
