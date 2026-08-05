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
