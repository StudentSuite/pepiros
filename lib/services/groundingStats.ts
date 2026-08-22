import "server-only";
import type { Workspace } from "@/types/anchor";

/**
 * Grounding coverage and drop rate, computed from real evidence rows
 * (issue #282).
 *
 * These two numbers used to be seeded. `Post.groundingCoverage`'s own type
 * comment read "Grounding stats, the honest ones: these come from the
 * verifier", which was true of a real ingested post and false of every seeded
 * one on the site: the figure came from lib/data/seed.ts, on a public page,
 * in a product whose position is that a measured number and an invented one
 * must be distinguishable. Issue #253 removed the display; this is the other
 * half, the actual measurement.
 *
 * Both are `null` when there is nothing to measure. A paper with no evidence
 * rows has not scored zero coverage, it has no coverage figure at all, and
 * collapsing those two is the exact mistake that let a fabricated percentage
 * look measured. Callers must not coerce null to 0.
 */

export interface GroundingStats {
  /**
   * Share of the paper's chunks that at least one surviving anchor points at.
   *
   * "How much of the source does the write-up actually reach", not "how
   * confident are we": a graph can cite three sentences perfectly and still
   * have read almost none of the paper, and this is the number that says so.
   */
  coverage: number | null;
  /**
   * Share of model-claimed anchors that failed verification and were stripped.
   *
   * An `unsupported` row is precisely that record: the generator claimed a
   * quote, the deterministic matcher could not locate it, and the anchor was
   * dropped rather than left dangling. So the denominator is every claimed
   * anchor and the numerator is the ones that did not survive.
   */
  dropRate: number | null;
  /** Denominators, so a caller can say "3 of 210" rather than only "1%". */
  totalChunks: number;
  citedChunks: number;
  totalEvidence: number;
  droppedEvidence: number;
}

export function computeGroundingStats(workspace: Workspace): GroundingStats {
  const totalChunks = workspace.chunks.length;
  const totalEvidence = workspace.evidence.length;

  // Distinct chunks, not distinct evidence rows: five claims anchored to one
  // sentence is one sentence of coverage, not five.
  const cited = new Set<string>();
  for (const evidence of workspace.evidence) {
    if (evidence.anchor) cited.add(evidence.anchor.chunkId);
  }

  const dropped = workspace.evidence.filter((e) => e.tier === "unsupported").length;

  return {
    coverage: totalChunks > 0 && totalEvidence > 0 ? cited.size / totalChunks : null,
    dropRate: totalEvidence > 0 ? dropped / totalEvidence : null,
    totalChunks,
    citedChunks: cited.size,
    totalEvidence,
    droppedEvidence: dropped,
  };
}
