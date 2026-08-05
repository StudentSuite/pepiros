import type { Chunk, EvidenceTier, Numeric } from "@/types/anchor";
import { normalize, tokenSetRatio } from "./fuzzy";
import { checkEntailmentFloor } from "./entail";
import { QUOTE_LOCATED_THRESHOLD, PARAPHRASE_THRESHOLD } from "./verify";

/**
 * Reverse audit (app/api/audit/route.ts TODO): given an externally-authored
 * summary with no citation markers, sentence-split it and, for each
 * sentence, find whichever chunk in the corpus it best matches -- there's no
 * claimed ref to resolve here, so this is a full sweep over every chunk
 * rather than the O(1) refIndex lookup lib/grounding/verify.ts uses for a
 * model's own claims.
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
  matchScore: number;
  numericOk: boolean | null;
  tier: EvidenceTier;
}

export function auditSentence(
  sentence: string,
  chunks: Chunk[],
  numericsByChunkId: Map<string, Numeric[]>,
): SentenceAudit {
  const normalizedSentence = normalize(sentence);

  let best: { chunk: Chunk; score: number } | null = null;
  for (const chunk of chunks) {
    const score = tokenSetRatio(normalizedSentence, normalize(chunk.text));
    if (!best || score > best.score) {
      best = { chunk, score };
    }
  }

  if (!best) {
    return { sentence, bestChunkId: null, matchScore: 0, numericOk: null, tier: "unsupported" };
  }

  let tier: EvidenceTier;
  if (best.score >= QUOTE_LOCATED_THRESHOLD) tier = "quote_located";
  else if (best.score >= PARAPHRASE_THRESHOLD) tier = "paraphrase";
  else tier = "unsupported";

  const numericOk = checkEntailmentFloor(sentence, numericsByChunkId.get(best.chunk.id) ?? []);
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
  const numericsByChunkId = new Map<string, Numeric[]>();
  for (const numeric of numerics) {
    const existing = numericsByChunkId.get(numeric.chunkId) ?? [];
    existing.push(numeric);
    numericsByChunkId.set(numeric.chunkId, existing);
  }

  return splitSentences(text).map((sentence) => auditSentence(sentence, chunks, numericsByChunkId));
}
