import { describe, expect, it } from "vitest";
import type { Chunk } from "@/types/anchor";
import { verifyAndBindClaims } from "./verify";

const CHUNKS: Chunk[] = [
  {
    id: "c1",
    paperId: "p1",
    sectionId: "s1",
    kind: "prose",
    page: 1,
    text: "Participants were randomized 1:1 to receive bright light exposure.",
    rects: [{ page: 1, x0: 0, y0: 0, x1: 100, y1: 20 }],
    ordinal: 1,
  },
];

describe("verifyAndBindClaims", () => {
  it("binds a real Groq-observed bracket/caret-swapped marker (^[n0]) the same as a compliant [^n0]", () => {
    const { bodyMd, evidence } = verifyAndBindClaims({
      nodeId: "n1",
      bodyMd: "Participants were randomized 1:1.^[n0]",
      claims: [{ refs: ["C1"], quote: "Participants were randomized 1:1 to receive bright light exposure." }],
      chunks: CHUNKS,
      numerics: [],
      idPrefix: "n1-e",
    });

    expect(bodyMd).not.toContain("^[n0]");
    expect(bodyMd).toContain(`[^${evidence[0]!.id}]`);
  });
});
