import type { Chunk, EvidenceTier, Numeric } from "@/types/anchor";
import { prepare, tokenSetRatioAtLeast, type PreparedText } from "./fuzzy";
import { checkEntailmentFloor } from "./entail";
import { QUOTE_LOCATED_THRESHOLD, PARAPHRASE_THRESHOLD } from "./verify";

/**
 * Reverse audit (app/api/audit/route.ts): given an externally-authored summary
 * with no citation markers, sentence-split it and, for each sentence, find
 * whichever chunk in the corpus it best matches -- there's no claimed ref to
 * resolve here, so this is a full sweep over every chunk rather than the O(1)
 * refIndex lookup lib/grounding/verify.ts uses for a model's own claims.
 *
 * That sweep is why this file prepares the corpus once and prunes with
 * tokenSetRatioUpperBound. Scoring every (sentence, chunk) pair with the full
 * Levenshtein pass is O(sentences * chunks * chunkChars^2), which is
 * imperceptible against the bundled fixture and unusable against three real
 * papers. The bound is admissible, so the pruned sweep returns the same
 * best-matching chunk an exhaustive one would.
 */

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z0-9])/;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SentenceAudit {
  sentence: string;
  bestChunkId: string | null;
  /**
   * Exact token_set_ratio when the sentence reached at least `paraphrase`.
   * For an unsupported sentence it is an upper bound instead: the sweep stops
   * scoring a chunk once it has proved the chunk cannot clear the threshold,
   * and the exact similarity of a dropped sentence is not actionable anyway.
   */
  matchScore: number;
  numericOk: boolean | null;
  tier: EvidenceTier;
}

export interface PreparedCorpus {
  chunks: Array<{ chunk: Chunk; prepared: PreparedText }>;
  numericsByChunkId: Map<string, Numeric[]>;
}

/** Tokenizes every chunk once, so a multi-sentence audit does not redo it per sentence. */
export function prepareCorpus(chunks: Chunk[], numerics: Numeric[]): PreparedCorpus {
  const numericsByChunkId = new Map<string, Numeric[]>();
  for (const numeric of numerics) {
    const existing = numericsByChunkId.get(numeric.chunkId) ?? [];
    existing.push(numeric);
    numericsByChunkId.set(numeric.chunkId, existing);
  }

  return {
    chunks: chunks.map((chunk) => ({ chunk, prepared: prepare(chunk.text) })),
    numericsByChunkId,
  };
}

function bestMatch(
  prepared: PreparedText,
  corpus: PreparedCorpus,
): { chunk: Chunk; score: number } | null {
  // Each call gets a floor and stops as soon as it has proved this chunk
  // cannot beat it. The floor starts at the paraphrase threshold rather than
  // at -Infinity: a sentence no chunk supports is reported as `unsupported`
  // with its chunk id discarded, so resolving which of several sub-threshold
  // chunks was marginally closest is work whose answer is then thrown away,
  // and it is exactly the work that made a real corpus unusable.
  //
  // Above the threshold the floor only ever rises to a real score, so the
  // bound stays admissible and the chunk returned is the one an exhaustive
  // sweep would have returned.
  let best: { chunk: Chunk; score: number } | null = null;
  for (const entry of corpus.chunks) {
    const floor = Math.max(best?.score ?? -1, PARAPHRASE_THRESHOLD - Number.EPSILON);
    const score = tokenSetRatioAtLeast(prepared, entry.prepared, floor);
    if (!best || score > best.score) {
      best = { chunk: entry.chunk, score };
    }
  }
  return best;
}

export function auditSentence(sentence: string, corpus: PreparedCorpus): SentenceAudit {
  const best = bestMatch(prepare(sentence), corpus);

  if (!best) {
    return { sentence, bestChunkId: null, matchScore: 0, numericOk: null, tier: "unsupported" };
  }

  let tier: EvidenceTier;
  if (best.score >= QUOTE_LOCATED_THRESHOLD) tier = "quote_located";
  else if (best.score >= PARAPHRASE_THRESHOLD) tier = "paraphrase";
  else tier = "unsupported";

  const numericOk = checkEntailmentFloor(
    sentence,
    corpus.numericsByChunkId.get(best.chunk.id) ?? [],
  );
  if (tier !== "unsupported" && numericOk === false) tier = "unsupported";

  return {
    sentence,
    bestChunkId: tier === "unsupported" ? null : best.chunk.id,
    matchScore: best.score,
    numericOk,
    tier,
  };
}

export function auditText(text: string, chunks: Chunk[], numerics: Numeric[]): SentenceAudit[] {
  const corpus = prepareCorpus(chunks, numerics);
  return splitSentences(text).map((sentence) => auditSentence(sentence, corpus));
}
