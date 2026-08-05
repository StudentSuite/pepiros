import type { Numeric } from "@/types/anchor";
import { extractNumericTokens, numericTokenMatchesRow } from "./numeric";

/**
 * The entailment overlap floor (plan.md §4): a fuzzy-matched quote proves
 * quotation provenance, not entailment -- a model can attach a real Methods
 * sentence to a reversed or overstated conclusion and still score 1.0 on
 * tokenSetRatio. This catches that failure mode by requiring every
 * number/unit/comparator the claim asserts to also exist in the anchored
 * chunk's numerics ledger.
 *
 * Returns null when the claim has no numeric content to check (nothing to
 * fail on, so callers should not treat null as "passed").
 */
export function checkEntailmentFloor(claimText: string, chunkNumerics: Numeric[]): boolean | null {
  const claimedTokens = extractNumericTokens(claimText);
  if (claimedTokens.length === 0) return null;

  return claimedTokens.every((token) =>
    chunkNumerics.some((row) => numericTokenMatchesRow(token, row)),
  );
}
