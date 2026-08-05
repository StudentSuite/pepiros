import type { Chunk, Evidence, Numeric } from "@/types/anchor";
import { buildRefIndex } from "@/lib/grounding/anchor";
import {
  stripDroppedCitation,
  verifyClaims,
  type ClaimedEvidence,
} from "@/lib/grounding/verify";

/**
 * Thin API-facing wrapper around lib/grounding/verify.ts (plan.md: "keep the
 * deterministic fuzzy-match + entailment-floor logic [in lib/grounding/],
 * service layer is the thin API-facing wrapper"). Both app/api/verify/route.ts
 * and mcp/server.ts's `verify_claim`/`create_node` tools should call this,
 * never lib/grounding/verify.ts directly -- and never trust a
 * client-asserted `quote_located`, always re-run this against the corpus.
 */

export interface VerifyClaimsInput {
  chunks: Chunk[];
  numerics: Numeric[];
  claims: ClaimedEvidence[];
}

export interface VerifiedClaim {
  evidence: Omit<Evidence, "id">;
  hallucinatedRef: boolean;
}

export function verifyClaimsAgainstCorpus({ chunks, numerics, claims }: VerifyClaimsInput): VerifiedClaim[] {
  const refIndex = buildRefIndex(chunks, numerics);
  return verifyClaims(claims, refIndex).map(({ hallucinatedRef, ...evidence }) => ({
    evidence,
    hallucinatedRef,
  }));
}

/**
 * Re-verifies a single already-written node's evidence rows and returns the
 * bodyMd with any now-dropped citations stripped. Callers pass in the
 * evidence rows keyed by their evidence-row id (e.g. "e6") so the [^e6]
 * marker can be found -- this fn does not invent ids.
 */
export function reconcileBodyWithVerifiedEvidence(
  bodyMd: string,
  verified: Array<{ evidenceId: string; tier: Evidence["tier"] }>,
): string {
  return verified.reduce(
    (body, { evidenceId, tier }) =>
      tier === "unsupported" ? stripDroppedCitation(body, evidenceId) : body,
    bodyMd,
  );
}
