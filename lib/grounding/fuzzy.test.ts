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

  // Also the regression guard for issue #260's fix below: this quote's 4
  // distinct tokens (including the distinctive "1:1") sit right at
  // MIN_SUBSTANTIVE_TOKENS, so this must keep passing alongside the new
  // "short, generic quote" test that must NOT score highly.
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

  it("does not score a short, generic quote near 1 against an unrelated chunk that merely contains the same common words (issue #260)", () => {
    // Previously: token_set_ratio's subset shortcut (core === combinedA when
    // a's whole token set is a subset of b's) scores 1.0 regardless of how
    // few or generic those shared tokens are. A 3-distinct-token quote made
    // of ordinary words can land inside almost any real chunk purely by
    // chance, with no requirement it covers a meaningful fraction of what the
    // chunk actually says -- checkEntailmentFloor gives no backstop for a
    // non-numeric claim, so this used to be scored quote_located outright.
    const unrelatedChunk =
      "The intervention group received 30 minutes of bright light exposure each morning " +
      "for four consecutive weeks, and patients improved significantly on the primary sleep outcome.";
    expect(tokenSetRatio("patients improved significantly", unrelatedChunk)).toBeLessThan(0.92);
  });

  it("scores an empty or purely-punctuation quote at 0 against any chunk, never 1 (issue #152)", () => {
    // Previously: an empty a.tokens made core === combinedA === "" trivially
    // (both the intersection and a's leftover are empty), and the
    // lengthCeiling(0,0)/levenshteinRatio("","") special cases to 1 both
    // fired on that degenerate pair -- scoring a blank claim quote as a
    // perfect match against literally anything, the worst possible failure
    // this product defines (a claim tiered quote_located when it isn't).
    expect(tokenSetRatio("", "Participants were randomized 1:1 to receive bright light.")).toBe(0);
    expect(tokenSetRatio("...---...", "Participants were randomized 1:1.")).toBe(0);
    expect(tokenSetRatio("Participants were randomized 1:1.", "")).toBe(0);
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
