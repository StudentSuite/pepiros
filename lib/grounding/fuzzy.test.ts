import { describe, expect, it } from "vitest";
import { normalize, prepare, tokenSetRatio, tokenSetRatioUpperBound } from "./fuzzy";

describe("normalize", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalize("  Participants were randomized 1:1, using...  ")).toBe(
      "participants were randomized 1 1 using",
    );
  });
});

describe("tokenSetRatio", () => {
  it("scores an exact quote at 1", () => {
    const text = "participants were randomized 1:1 to bright light or placebo";
    expect(tokenSetRatio(text, text)).toBe(1);
  });

  it("scores a verbatim subset of a longer chunk near 1", () => {
    const chunk =
      "Participants were randomized 1:1 to receive 30 minutes of bright light exposure " +
      "within one hour of waking, or a dim-light placebo, for four consecutive weeks.";
    expect(tokenSetRatio("Participants were randomized 1:1", chunk)).toBeGreaterThan(0.92);
  });

  it("scores unrelated text low", () => {
    expect(
      tokenSetRatio(
        "the mitochondrion is the powerhouse of the cell",
        "Participants were randomized 1:1 to receive bright light exposure.",
      ),
    ).toBeLessThan(0.75);
  });

  it("is insensitive to token order, which is why the entailment floor exists", () => {
    const a = "sleep improved because light exposure increased";
    const b = "light exposure increased because sleep improved";
    expect(tokenSetRatio(a, b)).toBe(1);
  });
});

describe("tokenSetRatioUpperBound", () => {
  // The prune in reverseAudit only returns the true argmax if this bound is
  // never below the score it bounds. Checked over adversarial-ish pairs
  // (subset, superset, disjoint, partial overlap, empty).
  const samples = [
    "participants were randomized 1:1 to bright light or placebo",
    "Participants were randomized",
    "bright light exposure improved sleep onset latency by 34%",
    "the mitochondrion is the powerhouse of the cell",
    "sleep onset latency",
    "",
    "a b c d e f g h i j k l m n o p",
    "a b c",
  ];

  it("is never below the score it bounds", () => {
    for (const a of samples) {
      for (const b of samples) {
        const pa = prepare(a);
        const pb = prepare(b);
        const bound = tokenSetRatioUpperBound(pa, pb);
        const score = tokenSetRatio(a, b);
        expect(bound).toBeGreaterThanOrEqual(score - 1e-9);
      }
    }
  });
});
