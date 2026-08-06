import type { Chunk, Numeric } from "@/types/anchor";

/**
 * Builds the stable-id context block a model is shown (docs/PLAN-V1.md §4.2):
 *
 *   [C7  | Methods  | p.4] Participants were randomized 1:1 using a...
 *   [N12 | Results  | p.5] 34% (95% CI 21-45), p=0.003
 *
 * The ids are `C{chunk.ordinal}` / `N{numeric.ordinal}` -- the exact same ids
 * lib/grounding/anchor.ts's buildRefIndex resolves later, so a generator's
 * claimed ref is guaranteed resolvable (or, if the model invents one that was
 * never handed to it, guaranteed to resolve to nothing and get flagged
 * `hallucinated_ref` by lib/grounding/verify.ts -- there is no ref space for
 * a model to guess into that would accidentally hit a real row).
 */

function sectionLabel(sectionId: string | null): string {
  if (!sectionId) return "Unsectioned";
  const slug = sectionId.split("-").pop() ?? sectionId;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function formatChunkLine(chunk: Chunk): string {
  return `[C${chunk.ordinal} | ${sectionLabel(chunk.sectionId)} | p.${chunk.page}] ${chunk.text}`;
}

export function formatNumericLine(numeric: Numeric, chunk: Chunk): string {
  return `[N${numeric.ordinal} | ${sectionLabel(chunk.sectionId)} | p.${chunk.page}] ${numeric.rawText}`;
}

/**
 * One block per paper: every chunk, then every numeric (grouped after its
 * chunk lines rather than interleaved, so a generator sees the full prose
 * context before the extracted statistics restate part of it). Chunks not
 * belonging to `paperId` are excluded -- the whole point of chunking
 * per-paper is that a generator for paper A never sees paper B's text.
 */
export function buildContextBlock(paperId: string, chunks: Chunk[], numerics: Numeric[]): string {
  const paperChunks = chunks.filter((c) => c.paperId === paperId).sort((a, b) => a.ordinal - b.ordinal);
  const chunkById = new Map(paperChunks.map((c) => [c.id, c] as const));
  const paperNumerics = numerics
    .filter((n) => chunkById.has(n.chunkId))
    .sort((a, b) => a.ordinal - b.ordinal);

  const chunkLines = paperChunks.map(formatChunkLine);
  const numericLines = paperNumerics.map((n) => formatNumericLine(n, chunkById.get(n.chunkId)!));

  return [...chunkLines, ...numericLines].join("\n");
}
