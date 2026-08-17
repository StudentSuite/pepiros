import { describe, expect, it } from "vitest";
import type { Chunk, Evidence } from "@/types/anchor";
import { reverifyNodeEvidence, verifyAndBindClaims } from "./verify";

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

describe("reverifyNodeEvidence", () => {
  const anchoredEvidence: Evidence = {
    id: "n1-e1",
    nodeId: "n1",
    refId: "C1",
    anchor: {
      chunkId: "c1",
      quote: "Participants were randomized 1:1 to receive bright light exposure.",
      spans: CHUNKS[0]!.rects,
    },
    tier: "quote_located",
    matchScore: 1,
    numericOk: null,
  };

  it("keeps a quote_located badge when the edited body still matches the source", () => {
    const { evidence } = reverifyNodeEvidence({
      bodyMd: "Participants were randomized 1:1 to receive bright light exposure.[^n1-e1]",
      evidence: [anchoredEvidence],
      chunks: CHUNKS,
      numerics: [],
    });

    expect(evidence[0]!.tier).toBe("quote_located");
    expect(evidence[0]!.anchor).not.toBeNull();
  });

  it("downgrades to unsupported and strips the marker when the edit no longer matches the source", () => {
    const { bodyMd, evidence } = reverifyNodeEvidence({
      bodyMd: "Participants all received a placebo instead.[^n1-e1]",
      evidence: [anchoredEvidence],
      chunks: CHUNKS,
      numerics: [],
    });

    expect(evidence[0]!.tier).toBe("unsupported");
    expect(evidence[0]!.anchor).toBeNull();
    expect(bodyMd).not.toContain("[^n1-e1]");
  });

  it("leaves an already-dropped row (no anchor) untouched", () => {
    const dropped: Evidence = { ...anchoredEvidence, anchor: null, tier: "unsupported" };
    const { evidence } = reverifyNodeEvidence({
      bodyMd: "Anything at all.",
      evidence: [dropped],
      chunks: CHUNKS,
      numerics: [],
    });

    expect(evidence[0]).toEqual(dropped);
  });
});
