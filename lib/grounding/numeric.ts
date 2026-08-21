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
// Issue #262: real papers routinely use the Unicode <=/>= glyphs (U+2264/
// U+2265), not just ASCII "<="/">=" -- without them, a claim quoting
// "p ≤ 0.05" extracted zero tokens, so checkEntailmentFloor returned
// null ("nothing to check") and skipped verification entirely instead of
// actually comparing it, rather than the claim just failing to parse loudly.
const P_VALUE_RE = /\bp\s*([<>]=?|≤|≥|~|=)\s*(\d+(?:\.\d+)?)/gi;
// Negative lookahead excludes the "95% CI ..." confidence-level annotation
// itself -- it's boilerplate around a range, not a claimed statistic with
// its own numerics-table row.
const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%(?!\s*ci\b)/gi;
const EFFECT_SIZE_RE = /\b(d|r|or|hr|rr)\s*=\s*(-?\d+(?:\.\d+)?)/gi;

// The Unicode <=/>= glyphs aren't valid NumericComparator values themselves
// (types/anchor.ts's frozen enum only has the ASCII forms) -- normalized to
// their ASCII equivalent here rather than widening that type for a purely
// notational variant of the same comparator.
const UNICODE_COMPARATOR_ALIASES: Record<string, NumericComparator> = { "≤": "<=", "≥": ">=" };

function normalizeComparator(raw: string): NumericComparator {
  return UNICODE_COMPARATOR_ALIASES[raw] ?? (raw as NumericComparator);
}

export function extractNumericTokens(text: string): NumericToken[] {
  const tokens: NumericToken[] = [];

  for (const match of text.matchAll(P_VALUE_RE)) {
    tokens.push({
      raw: match[0].trim(),
      value: Number.parseFloat(match[2]!),
      unit: null,
      comparator: match[1] ? normalizeComparator(match[1]) : "=",
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

/**
 * Issue #261: this used to return true whenever *either* side had no unit,
 * not just when both did -- a p-value token always has unit: null
 * (extractNumericTokens' only null-unit producer), so any other unit-less
 * numerics row with the same bare value would match by pure coincidence,
 * even though the two numbers represent unrelated quantities. That is
 * exactly the "genuine quote attached to a reversed/overstated conclusion"
 * class the entailment floor exists to catch.
 *
 * A bare null-vs-null check isn't enough to fix this: `unit: null` doesn't
 * uniquely mean "this is a p-value" on the *row* side -- ingest can tag
 * other unit-less numerics (a sample size, a raw count) the same way, and
 * NumericToken carries no role of its own to disambiguate. `role: "p"` is
 * this codebase's actual convention for a p-value row (confirmed against
 * fixtures/workspace.json), so that's the real signal: a null-unit token
 * only matches a row that is itself genuinely a p-value.
 */
function unitsCompatible(token: NumericToken, row: Numeric): boolean {
  if (!token.unit) return row.unit === null && row.role === "p";
  if (!row.unit) return false;
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
