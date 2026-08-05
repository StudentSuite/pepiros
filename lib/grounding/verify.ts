import type { Evidence, EvidenceTier } from "@/types/anchor";
import { buildAnchor, type RefIndex } from "./anchor";
import { checkEntailmentFloor } from "./entail";
import { normalize, tokenSetRatio } from "./fuzzy";

/**
 * The grounding spine (plan.md §4) -- this is the product, everything else
 * is packaging. Fully deterministic, no LLM judge:
 *
 *   chunk = resolve(ref)
 *   if !chunk        -> drop, log hallucinated_ref
 *   score = token_set_ratio(normalize(quote), normalize(chunk.text))
 *   if score >= 0.92  -> quote_located
 *   elif score >= 0.75 -> paraphrase (badged, kept)
 *   else              -> drop anchor, strip [^eN] from body_md
 *
 * Plus the entailment overlap floor: a genuine quote can still be attached
 * to a reversed or overstated conclusion, so every number/unit/comparator
 * the claim asserts must also appear in the anchored chunk's numerics.
 */

export const QUOTE_LOCATED_THRESHOLD = 0.92;
export const PARAPHRASE_THRESHOLD = 0.75;

export interface ClaimedEvidence {
  nodeId: string;
  refId: string;
  quote: string;
}

export type VerifiedEvidence = Omit<Evidence, "id"> & { hallucinatedRef: boolean };

export function verifyClaim(claim: ClaimedEvidence, refIndex: RefIndex): VerifiedEvidence {
  const resolved = refIndex.get(claim.refId);

  if (!resolved) {
    return {
      nodeId: claim.nodeId,
      refId: claim.refId,
      anchor: null,
      tier: "unsupported",
      matchScore: 0,
      numericOk: null,
      hallucinatedRef: true,
    };
  }

  const { chunk, chunkNumerics } = resolved;
  const score = tokenSetRatio(normalize(claim.quote), normalize(chunk.text));

  let tier: EvidenceTier;
  if (score >= QUOTE_LOCATED_THRESHOLD) {
    tier = "quote_located";
  } else if (score >= PARAPHRASE_THRESHOLD) {
    tier = "paraphrase";
  } else {
    tier = "unsupported";
  }

  const numericOk = checkEntailmentFloor(claim.quote, chunkNumerics);

  // A genuine-looking quote whose numbers don't check out is the exact
  // failure mode the entailment floor exists to catch -- demote it even if
  // the fuzzy match alone would have passed.
  if (tier !== "unsupported" && numericOk === false) {
    tier = "unsupported";
  }

  const anchorKept = tier !== "unsupported";

  return {
    nodeId: claim.nodeId,
    refId: claim.refId,
    anchor: anchorKept ? buildAnchor(chunk, claim.quote) : null,
    tier,
    matchScore: score,
    numericOk,
    hallucinatedRef: false,
  };
}

export function verifyClaims(claims: ClaimedEvidence[], refIndex: RefIndex): VerifiedEvidence[] {
  return claims.map((claim) => verifyClaim(claim, refIndex));
}

/**
 * Strips a dropped citation's inline marker from rendered prose, per plan.md
 * §4 ("drop anchor, strip [^eN] from body_md"). `refId` here is the
 * evidence-row id (e1, e2, ...), not the C/N context id.
 */
export function stripDroppedCitation(bodyMd: string, evidenceRefId: string): string {
  const marker = `[^${evidenceRefId}]`;
  return bodyMd.split(marker).join("");
}
