import type { Evidence } from "@/types/anchor";

/**
 * Matches an evidence marker's id, not just the short `[^e2]` shape this
 * used to assume. Verified live against a real ingested paper: verify.ts's
 * `verifyAndBindClaims` mints evidence ids as `${idPrefix}${n}` where
 * idPrefix is `${nodeId}-e` (lib/agents/orchestrator.ts), so the real marker
 * bound into body_md is the long, node-prefixed form
 * (`[^paper-a0383c28-leaf-gen_risk-risk_assess-e2]`), not the short one the
 * fixture's hand-authored evidence ids happen to use. The narrower regex
 * matched neither the resolver lookup nor the strip pass, so the raw marker
 * leaked straight into rendered claim prose on every real-ingested paper.
 * `[\w-]+` covers both shapes without assuming which one a given workspace
 * uses.
 */
const REF_MARKER = /\[\^([\w-]+)\]/g;

/** Strips inline evidence markers out of body text so a truncated card snippet reads
 *  as clean prose; the markers themselves surface as a `RefChip` row via InlineRefs. */
export function stripRefMarkers(bodyMd: string): string {
  return bodyMd.replace(REF_MARKER, "").replace(/\s{2,}/g, " ").trim();
}

/** Resolves a node's inline evidence markers to their evidence rows, in first-seen
 *  order. A marker with no matching row is skipped here -- a dangling marker is a
 *  render error elsewhere in the pipeline (plan.md §5), not something to mask. */
export function resolveInlineRefs(bodyMd: string, evidence: Evidence[]): Evidence[] {
  const ids = [...bodyMd.matchAll(REF_MARKER)].map((m) => m[1]!);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const result: Evidence[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = byId.get(id);
    if (row) result.push(row);
  }
  return result;
}
