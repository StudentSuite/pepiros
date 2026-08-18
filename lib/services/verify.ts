import type { Chunk, Evidence, Numeric } from "@/types/anchor";
import { buildRefIndex } from "@/lib/grounding/anchor";
import {
  PARAPHRASE_THRESHOLD,
  QUOTE_LOCATED_THRESHOLD,
  stripDroppedCitation,
  verifyClaims,
  type ClaimedEvidence,
} from "@/lib/grounding/verify";
import { checkEntailmentFloor } from "@/lib/grounding/entail";
import { normalize, tokenSetRatio } from "@/lib/grounding/fuzzy";

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
/**
 * A model is told to mark each claim with a notional "[^n{i}]" marker, but
 * this exact slip was observed live from visionModel()'s free OpenRouter
 * model (issue #59): it cited the bare ref directly ("[C7]") instead,
 * leaving nothing for bindEvidenceMarkers to find below -- the final body
 * would keep the raw, unlinked "[C7]" text forever with no citation chip.
 * Recovers by rewriting the first bare "[refId]" occurrence (for any ref
 * that claim already cites) into the expected notional marker before
 * binding. Same "a prompt is a request, not a guarantee" class as
 * normalizeRef above.
 */
function recoverMissingNotionalMarkers(bodyMd: string, claims: Array<{ refs: string[] }>): string {
  return claims.reduce((body, claim, i) => {
    if (new RegExp(`\\[\\^n${i}\\]|\\^\\[n${i}\\]`).test(body)) return body;
    for (const ref of claim.refs) {
      const bare = new RegExp(`\\[${ref}\\]`);
      if (bare.test(body)) return body.replace(bare, `[^n${i}]`);
    }
    return body;
  }, bodyMd);
}

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

  const normalizedBody = recoverMissingNotionalMarkers(input.bodyMd, input.claims);
  const bound = bindEvidenceMarkers(normalizedBody, markerReplacements);
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
 *
 * Also matches "^[n{i}]" (bracket/caret swapped) -- observed live from a real
 * Groq call despite the prompt spelling out "[^n0]" explicitly. Same "a
 * prompt is a request, not a guarantee" class as normalizeRef and
 * lib/chat/citations.ts's CJK-bracket tolerance: a non-compliant marker
 * should still resolve to a real evidence chip instead of leaking as raw
 * text into the rendered node body.
 */
function bindEvidenceMarkers(bodyMd: string, markerReplacements: string[]): string {
  return markerReplacements.reduce(
    (body, replacement, i) => body.replace(new RegExp(`\\[\\^n${i}\\]|\\^\\[n${i}\\]`, "g"), () => replacement),
    bodyMd,
  );
}

export interface ReverifyNodeEvidenceInput {
  bodyMd: string;
  /** This node's current evidence rows -- only ones with a live anchor are re-checked. */
  evidence: Evidence[];
  chunks: Chunk[];
  numerics: Numeric[];
}

/**
 * Issue #77: editing a node's body through the inspector's Save button used
 * to leave every existing Evidence row's tier untouched, no matter what the
 * new text said -- a "quote located" badge stayed put even after a rewrite
 * that no longer matched its source. `Evidence.anchor.quote` is the text
 * that was originally checked; a body edit never touches that field, so
 * simply re-running the unchanged check against the unchanged quote would
 * rubber-stamp the same result regardless of what the user wrote.
 *
 * What actually needs re-checking is whether the *edited* body still
 * supports each citation, so this treats the whole new bodyMd as the
 * candidate claim text and re-runs it against each evidence row's already-
 * anchored source chunk -- same tokenSetRatio + entailment-floor thresholds
 * lib/grounding/verify.ts's verifyClaim uses, no LLM judge, same as every
 * other tier decision in this app. token_set_ratio's intersection-based
 * scoring means surrounding unrelated prose in a longer body doesn't
 * automatically tank the score for an unrelated citation elsewhere in it --
 * what matters is whether the source chunk's own wording is still present
 * somewhere in the edited text.
 *
 * A row already dropped (`anchor: null`) has nothing left to re-check --
 * its marker is already stripped, and it stays that way.
 */
export function reverifyNodeEvidence({
  bodyMd,
  evidence,
  chunks,
  numerics,
}: ReverifyNodeEvidenceInput): { bodyMd: string; evidence: Evidence[] } {
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const numericsByChunk = new Map<string, Numeric[]>();
  for (const n of numerics) {
    const bucket = numericsByChunk.get(n.chunkId);
    if (bucket) bucket.push(n);
    else numericsByChunk.set(n.chunkId, [n]);
  }

  const normalizedBody = normalize(bodyMd);

  const nextEvidence = evidence.map((ev): Evidence => {
    if (!ev.anchor) return ev;
    const chunk = chunkById.get(ev.anchor.chunkId);
    if (!chunk) return ev;

    const score = tokenSetRatio(normalizedBody, normalize(chunk.text));
    let tier: Evidence["tier"] =
      score >= QUOTE_LOCATED_THRESHOLD ? "quote_located" : score >= PARAPHRASE_THRESHOLD ? "paraphrase" : "unsupported";

    const numericOk = checkEntailmentFloor(bodyMd, numericsByChunk.get(chunk.id) ?? []);
    if (tier !== "unsupported" && numericOk === false) tier = "unsupported";

    return {
      ...ev,
      tier,
      matchScore: score,
      numericOk,
      anchor: tier === "unsupported" ? null : ev.anchor,
    };
  });

  const nextBody = reconcileBodyWithVerifiedEvidence(
    bodyMd,
    nextEvidence.map((ev) => ({ evidenceId: ev.id, tier: ev.tier })),
  );

  return { bodyMd: nextBody, evidence: nextEvidence };
}
