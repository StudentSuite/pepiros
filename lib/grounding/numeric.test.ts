import { describe, expect, it } from "vitest";
import type { Numeric } from "@/types/anchor";
import { extractNumericTokens, numericTokenMatchesRow } from "./numeric";
import { checkEntailmentFloor } from "./entail";

function row(partial: Partial<Numeric> & Pick<Numeric, "value">): Numeric {
  return {
    id: "n-test",
    chunkId: "c-test",
    rawText: String(partial.value),
    unit: null,
    comparator: "=",
    role: "p",
    ordinal: 1,
    ...partial,
  };
}

describe("extractNumericTokens", () => {
  it("pulls p-values with their comparator", () => {
    expect(extractNumericTokens("the effect held (p < 0.05)")).toEqual([
      { raw: "p < 0.05", value: 0.05, unit: null, comparator: "<" },
    ]);
  });

  it("pulls percentages and effect sizes", () => {
    const tokens = extractNumericTokens("a 34% reduction (d=0.62)");
    expect(tokens).toEqual([
      { raw: "34%", value: 34, unit: "%", comparator: "=" },
      { raw: "d=0.62", value: 0.62, unit: "d", comparator: "=" },
    ]);
  });

  it("does not treat the 95% CI annotation as a claimed statistic", () => {
    expect(extractNumericTokens("34% (95% CI 21-45)")).toEqual([
      { raw: "34%", value: 34, unit: "%", comparator: "=" },
    ]);
  });

  it("returns nothing for prose with no statistics", () => {
    expect(extractNumericTokens("participants were randomized to two arms")).toEqual([]);
  });

  // Issue #262: the Unicode <=/>= glyphs are common in real papers; without
  // this, these extracted zero tokens, so the entailment floor silently
  // skipped verification entirely instead of actually checking the claim.
  it("pulls a p-value using the Unicode <=/>= glyphs, normalized to the ASCII comparator", () => {
    expect(extractNumericTokens("significant (p ≤ 0.05)")).toEqual([
      { raw: "p ≤ 0.05", value: 0.05, unit: null, comparator: "<=" },
    ]);
    expect(extractNumericTokens("not significant (p ≥ 0.1)")).toEqual([
      { raw: "p ≥ 0.1", value: 0.1, unit: null, comparator: ">=" },
    ]);
  });
});

describe("numericTokenMatchesRow", () => {
  // The regression this file exists for: bounded phrasing is the norm in the
  // biomedical corpus, and comparing values for equality demoted an exact
  // quote of "p < 0.05" to unsupported whenever the paper reported p = 0.003.
  it("satisfies a '<' claim with any reported value below the bound", () => {
    const [token] = extractNumericTokens("p < 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.003 }))).toBe(true);
  });

  it("rejects a '<' claim when the reported value is above the bound", () => {
    const [token] = extractNumericTokens("p < 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.4 }))).toBe(false);
  });

  it("does not accept the reverse direction", () => {
    const [token] = extractNumericTokens("p > 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.003 }))).toBe(false);
  });

  it("still requires equality when the claim asserts one", () => {
    const [token] = extractNumericTokens("34%");
    expect(numericTokenMatchesRow(token!, row({ value: 34, unit: "%" }))).toBe(true);
    expect(numericTokenMatchesRow(token!, row({ value: 21, unit: "%" }))).toBe(false);
  });

  it("rejects a value match across incompatible units", () => {
    const [token] = extractNumericTokens("34%");
    expect(numericTokenMatchesRow(token!, row({ value: 34, unit: "d" }))).toBe(false);
  });

  // Issue #261: a p-value token always has unit: null. This used to treat a
  // null unit on *either* side as compatible with anything, so a p-value
  // claim could match by bare value against any other unit-less numerics
  // row -- an unrelated quantity, not a p-value.
  it("rejects a p-value claim matching by bare value against a differently-typed unit-less row", () => {
    const [token] = extractNumericTokens("p = 0.05");
    // A row with no unit that is NOT itself a p-value (e.g. a raw sample
    // size or count the ingest pipeline tagged with no unit).
    expect(numericTokenMatchesRow(token!, row({ value: 0.05, unit: null, role: "n" }))).toBe(false);
  });

  it("still matches a p-value claim against a p-value row (both genuinely unit-less)", () => {
    const [token] = extractNumericTokens("p = 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.05, unit: null, role: "p" }))).toBe(true);
  });

  // Issue #153: the row can itself be reported as a bound, not just an exact
  // value -- previously only token.comparator was ever consulted, so a
  // source reporting the *opposite* direction from the claim still passed.
  it("rejects a claim of 'p < 0.05' against a source reporting 'p > 0.05' at the same value -- a reversed conclusion, not a match", () => {
    const [token] = extractNumericTokens("p < 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.05, comparator: ">" }))).toBe(false);
  });

  it("rejects a claim of 'p < 0.05' against a source reporting 'p > 0.1' (clearly incompatible ranges)", () => {
    const [token] = extractNumericTokens("p < 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.1, comparator: ">" }))).toBe(false);
  });

  it("accepts a claim of 'p < 0.05' against a source reporting 'p > 0.02' -- genuinely overlapping ranges (e.g. p=0.03 satisfies both)", () => {
    const [token] = extractNumericTokens("p < 0.05");
    expect(numericTokenMatchesRow(token!, row({ value: 0.02, comparator: ">" }))).toBe(true);
  });
});

describe("checkEntailmentFloor", () => {
  it("returns null when the claim asserts no statistic", () => {
    expect(checkEntailmentFloor("the trial was open-label", [])).toBeNull();
  });

  it("passes a bounded claim against the reported value", () => {
    const numerics = [row({ value: 0.003, role: "p" })];
    expect(checkEntailmentFloor("significant at p < 0.05", numerics)).toBe(true);
  });

  it("fails a claim stating a number the chunk never reports", () => {
    const numerics = [row({ value: 34, unit: "%", role: "effect_size" })];
    expect(checkEntailmentFloor("a 62% reduction", numerics)).toBe(false);
  });

  it("requires every claimed statistic to be present, not just one", () => {
    const numerics = [row({ value: 34, unit: "%", role: "effect_size" })];
    expect(checkEntailmentFloor("a 34% reduction (p < 0.05)", numerics)).toBe(false);
  });
});
