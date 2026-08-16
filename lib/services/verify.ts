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

/**
 * A model is instructed to cite the bare id ("C7"), not the full
 * context-block header ("C7 | Methods | p.4") -- but a prompt is a request,
 * not a guarantee, and this exact slip was observed live. Stripping to the
 * leading token before verification means a caller that ignores the
 * instruction still resolves correctly instead of silently registering as a
 * hallucinated_ref.
 */
function normalizeRef(ref: string): string {
  return ref.split("|")[0]!.trim();
}

export interface VerifyAndBindInput {
  nodeId: string;
  /** Body with notional "[^n0]", "[^n1]", ... markers, one per claims[i]. */
  bodyMd: string;
  claims: Array<{ refs: string[]; quote: string }>;
  chunks: Chunk[];
  numerics: Numeric[];
  /** Evidence row ids are `${idPrefix}${n}`, 1-indexed. */
  idPrefix: string;
}

/**
 * The single place every claims -> verified node path goes through:
 * lib/agents/orchestrator.ts's generator fan-out, lib/services/nodes.ts's
 * create_node/create_workspace, and anywhere else that turns a caller's
 * claimed {refs, quote} pairs into a real node body. Verifies every claim
 * against the corpus (never trusting a caller-asserted tier), binds each
 * notional "[^n{i}]" marker to its real evidence id(s) (an aggregate claim
 * with N refs becomes N Evidence rows, concatenated into one marker
 * replacement, so "every [^eN] marker has a matching evidence row" holds for
 * each individual marker, not just the claim as a whole), and strips any
 * marker whose claim turned out unsupported -- rather than leaving each
 * caller to reimplement this binding itself, which is exactly how it was
 * twice done incompletely (chat's Promote button, the synthesis pass) before
 * this was pulled out into one function.
 */
export function verifyAndBindClaims(input: VerifyAndBindInput): { bodyMd: string; evidence: Evidence[] } {
  const flatClaims: ClaimedEvidence[] = input.claims.flatMap((claim) =>
    claim.refs.map((refId) => ({ nodeId: input.nodeId, refId: normalizeRef(refId), quote: claim.quote })),
  );

  const verified = verifyClaimsAgainstCorpus({ chunks: input.chunks, numerics: input.numerics, claims: flatClaims });

  const evidence: Evidence[] = [];
  const markerReplacements: string[] = [];
  let cursor = 0;

  for (const claim of input.claims) {
    const group = verified.slice(cursor, cursor + claim.refs.length);
    cursor += claim.refs.length;

    const ids = group.map((result) => {
      const id = `${input.idPrefix}${evidence.length + 1}`;
      evidence.push({ id, ...result.evidence });
      return id;
    });
    markerReplacements.push(ids.map((id) => `[^${id}]`).join(""));
  }

  const bound = bindEvidenceMarkers(input.bodyMd, markerReplacements);
  const finalBody = evidence.reduce(
    (body, ev) => (ev.tier === "unsupported" ? stripDroppedCitation(body, ev.id) : body),
    bound,
  );

  return { bodyMd: finalBody, evidence };
}

/**
 * Replaces each notional "[^n{i}]" marker with the real, already-formatted
 * marker(s) assigned after verification -- positional, index i is the
 * replacement for the i-th claim. A single-ref claim's replacement is one
 * marker ("[^e7]"); a multi-ref (aggregate) claim's is the concatenation of
 * one marker per ref ("[^e7][^e8]"), since one Evidence row is still
 * one-ref-per-row.
 */
function bindEvidenceMarkers(bodyMd: string, markerReplacements: string[]): string {
  return markerReplacements.reduce(
    (body, replacement, i) => body.split(`[^n${i}]`).join(replacement),
    bodyMd,
  );
}
