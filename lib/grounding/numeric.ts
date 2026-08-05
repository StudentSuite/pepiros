import type { Numeric, NumericComparator } from "@/types/anchor";

export interface NumericToken {
  raw: string;
  value: number;
  unit: string | null;
  comparator: NumericComparator | null;
}

/**
 * Pulls statistically-meaningful number tokens out of free text -- the raw
 * material for the entailment overlap floor (plan.md §4): every one of these
 * must also appear in the anchored chunk's `numerics` rows, or the claim is
 * suspected of attaching a real quote to a misstated result.
 *
 * Deliberately scoped to p-values, percentages, and effect-size notation
 * (d=/r=/OR=/HR=/RR=) rather than every bare integer in the sentence --
 * incidental methodology numbers ("30 minutes", "1:1 randomization", "four
 * consecutive weeks") are not the failure mode this floor exists to catch
 * (plan.md §4: "a genuine quote attached to a reversed or overstated
 * conclusion"), and treating them as claims would fail exact quotes whose
 * chunk was never given a matching `numerics` row for that incidental
 * number.
 */
const P_VALUE_RE = /\bp\s*([<>]=?|~|=)\s*(\d+(?:\.\d+)?)/gi;
// Negative lookahead excludes the "95% CI ..." confidence-level annotation
// itself -- it's boilerplate around a range, not a claimed statistic with
// its own numerics-table row.
const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%(?!\s*ci\b)/gi;
const EFFECT_SIZE_RE = /\b(d|r|or|hr|rr)\s*=\s*(-?\d+(?:\.\d+)?)/gi;

export function extractNumericTokens(text: string): NumericToken[] {
  const tokens: NumericToken[] = [];

  for (const match of text.matchAll(P_VALUE_RE)) {
    tokens.push({
      raw: match[0].trim(),
      value: Number.parseFloat(match[2]!),
      unit: null,
      comparator: match[1] as NumericComparator ?? "=",
    });
  }

  for (const match of text.matchAll(PERCENT_RE)) {
    tokens.push({
      raw: match[0].trim(),
      value: Number.parseFloat(match[1]!),
      unit: "%",
      comparator: "=",
    });
  }

  for (const match of text.matchAll(EFFECT_SIZE_RE)) {
    tokens.push({
      raw: match[0].trim(),
      value: Number.parseFloat(match[2]!),
      unit: match[1]!.toLowerCase(),
      comparator: "=",
    });
  }

  return tokens;
}

const VALUE_EPSILON = 1e-6;

export function numericTokenMatchesRow(token: NumericToken, row: Numeric): boolean {
  if (Math.abs(token.value - row.value) > VALUE_EPSILON) return false;
  if (token.unit && row.unit && token.unit.toLowerCase() !== row.unit.toLowerCase()) {
    return false;
  }
  return true;
}
