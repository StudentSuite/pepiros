import type { Anchor, Chunk, Numeric } from "@/types/anchor";

/**
 * Rect extraction itself (page.search_for(quote) via PyMuPDF, sliding-window
 * fallback over get_text("words")) happens at ingest time in
 * scripts/parse.py and is stored directly on `chunks.rects` -- see plan.md
 * §2 ("Anchor coordinates"). This file is the query-time counterpart: given
 * the stable citation ids a model was handed ([C7|Methods|p.4], [N12|...]),
 * resolve them back to the chunk/numeric row so lib/grounding/verify.ts can
 * score the claimed quote against it.
 */

export type RefIndex = Map<string, { chunk: Chunk; numeric?: Numeric; chunkNumerics: Numeric[] }>;

/**
 * Assigns the stable per-context ids a model is shown -- "C{n}" for prose
 * chunks, "N{n}" for numerics -- in source order, and indexes them for O(1)
 * resolution. Figures ("F{n}") are not built here yet; the `figures` table
 * exists in lib/db/schema.ts but nothing produces figure chunks in this
 * pass.
 *
 * Every entry carries `chunkNumerics` -- ALL numerics belonging to the
 * resolved chunk, not just the one row a specific N-ref points at -- because
 * the entailment floor (plan.md §4) must catch a claim that cites a chunk by
 * its C-ref but states a number nowhere in that chunk's numerics ledger.
 */
export function buildRefIndex(chunks: Chunk[], numerics: Numeric[]): RefIndex {
  const index: RefIndex = new Map();
  const chunkById = new Map(chunks.map((c) => [c.id, c] as const));
  const numericsByChunkId = new Map<string, Numeric[]>();
  for (const numeric of numerics) {
    const existing = numericsByChunkId.get(numeric.chunkId) ?? [];
    existing.push(numeric);
    numericsByChunkId.set(numeric.chunkId, existing);
  }

  chunks.forEach((chunk, i) => {
    index.set(`C${i + 1}`, { chunk, chunkNumerics: numericsByChunkId.get(chunk.id) ?? [] });
  });

  numerics.forEach((numeric, i) => {
    const chunk = chunkById.get(numeric.chunkId);
    if (!chunk) return; // hallucinated_ref-shaped data, not our problem to fix here
    index.set(`N${i + 1}`, {
      chunk,
      numeric,
      chunkNumerics: numericsByChunkId.get(chunk.id) ?? [],
    });
  });

  return index;
}

/**
 * Binds a claimed quote to its resolved chunk. Spans are always the whole
 * chunk's rect list (multi-span, per plan.md §4 -- aggregate claims have no
 * single contiguous source sentence) since sub-line highlighting depends on
 * the ingest-time PyMuPDF pass, not this layer.
 */
export function buildAnchor(chunk: Chunk, quote: string): Anchor {
  return {
    chunkId: chunk.id,
    quote,
    spans: chunk.rects,
  };
}
