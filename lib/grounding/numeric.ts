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
/** "p ~ 0.05" and friends: relative band around the claimed value. */
const APPROX_TOLERANCE = 0.1;

function unitsCompatible(token: NumericToken, row: Numeric): boolean {
  if (!token.unit || !row.unit) return true;
  return token.unit.toLowerCase() === row.unit.toLowerCase();
}

interface Interval {
  lo: number;
  hi: number;
}

/**
 * Every comparator (claim-side or row-side) is really an interval of values
 * consistent with it -- "=" (or unset) a tight point interval, "<"/">" a
 * half-open ray, "~" a tolerance band. Issue #153's fix depends on building
 * this for the *row* too, not just the claim.
 */
function intervalFor(value: number, comparator: NumericComparator | null | undefined): Interval {
  switch (comparator) {
    case "<":
      return { lo: -Infinity, hi: value - VALUE_EPSILON };
    case "<=":
      return { lo: -Infinity, hi: value + VALUE_EPSILON };
    case ">":
      return { lo: value + VALUE_EPSILON, hi: Infinity };
    case ">=":
      return { lo: value - VALUE_EPSILON, hi: Infinity };
    case "~": {
      const tolerance = Math.abs(value) * APPROX_TOLERANCE;
      return { lo: value - tolerance, hi: value + tolerance };
    }
    case "=":
    case null:
    case undefined:
      return { lo: value - VALUE_EPSILON, hi: value + VALUE_EPSILON };
  }
}

function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.lo <= b.hi && b.lo <= a.hi;
}

/**
 * A claim may assert a bound rather than a value. "p < 0.05" is satisfied by a
 * numerics row of 0.003, so comparing values for equality would demote an
 * otherwise exact quote to `unsupported` -- and bounded phrasing is the norm in
 * the biomedical corpus this runs on. The comparator was already being parsed
 * out in extractNumericTokens; this is where it earns its keep.
 *
 * Issue #153: the row can *itself* be reported as a bound, not just an exact
 * value -- a source chunk saying "p > 0.05" (not significant) is not the same
 * claim as one saying "p = 0.003". The old version only ever read
 * `token.comparator` and compared the claim's bound against `row.value` as if
 * it were always an exact point, so a claim of "p < 0.05" against a row of
 * `{value: 0.05, comparator: ">"}` (the source reporting the *opposite*
 * direction) evaluated `0.05 < 0.05+epsilon` and passed -- exactly the
 * "genuine quote attached to a reversed conclusion" failure this floor
 * exists to catch. Both sides are now treated as intervals of values
 * consistent with what was said, and the claim only entails the source if
 * those intervals actually overlap -- there exists some value both are
 * simultaneously compatible with.
 */
export function numericTokenMatchesRow(token: NumericToken, row: Numeric): boolean {
  if (!unitsCompatible(token, row)) return false;
  return intervalsOverlap(intervalFor(token.value, token.comparator), intervalFor(row.value, row.comparator));
}
