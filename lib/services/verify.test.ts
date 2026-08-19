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

  it("binds a bare-ref citation (issue #59, visionModel()'s free OpenRouter model observed live) the same as a compliant [^n0]", () => {
    const { bodyMd, evidence } = verifyAndBindClaims({
      nodeId: "n1",
      bodyMd: "Participants were randomized 1:1 [C1].",
      claims: [{ refs: ["C1"], quote: "Participants were randomized 1:1 to receive bright light exposure." }],
      chunks: CHUNKS,
      numerics: [],
      idPrefix: "n1-e",
    });

    expect(bodyMd).not.toContain("[C1]");
    expect(bodyMd).toContain(`[^${evidence[0]!.id}]`);
  });

  it("does not let a ref containing regex metacharacters corrupt the bare-ref search (issue #154)", () => {
    // A model can emit the full header instead of the bare token
    // (normalizeRef's own doc comment) -- if that string reached the
    // RegExp unescaped, "|" would become alternation and "." a wildcard.
    const { bodyMd, evidence } = verifyAndBindClaims({
      nodeId: "n1",
      bodyMd: "Participants were randomized 1:1 [C1].",
      claims: [{ refs: ["C1 | Methods | p.4"], quote: "Participants were randomized 1:1 to receive bright light exposure." }],
      chunks: CHUNKS,
      numerics: [],
      idPrefix: "n1-e",
    });

    expect(bodyMd).not.toContain("[C1]");
    expect(bodyMd).toContain(`[^${evidence[0]!.id}]`);
  });

  it("recovers both claims when they share a ref and the model wrote only one bare mention (issue #155)", () => {
    const { bodyMd, evidence } = verifyAndBindClaims({
      nodeId: "n1",
      bodyMd: "Participants were randomized 1:1 to receive bright light exposure [C1].",
      claims: [
        { refs: ["C1"], quote: "Participants were randomized 1:1" },
        { refs: ["C1"], quote: "receive bright light exposure" },
      ],
      chunks: CHUNKS,
      numerics: [],
      idPrefix: "n1-e",
    });

    expect(bodyMd).not.toContain("[C1]");
    // Neither claim's evidence row is missing its marker -- both got bound
    // at the one shared occurrence, rather than the first claim consuming
    // it and the second silently losing its citation.
    expect(bodyMd).toContain(`[^${evidence[0]!.id}]`);
    expect(bodyMd).toContain(`[^${evidence[1]!.id}]`);
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
