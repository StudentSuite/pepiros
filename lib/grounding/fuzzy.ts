/**
 * Deterministic string-similarity primitives -- no LLM judge, no external
 * fuzzy-matching dependency. `tokenSetRatio` mirrors fuzzywuzzy's
 * token_set_ratio (tokenize, dedupe, compare the token-set permutations) but
 * derives its pairwise ratio from Levenshtein distance rather than
 * difflib.SequenceMatcher -- a documented approximation, not a port.
 */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** 0-1 similarity: 1 minus normalized edit distance. */
function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/**
 * A text with its token set already computed. Scoring one sentence against a
 * whole corpus (lib/grounding/reverseAudit.ts) re-reads the same chunk text
 * once per sentence, so the tokenization is hoisted out of the inner loop.
 */
export interface PreparedText {
  tokens: Set<string>;
}

export function prepare(text: string): PreparedText {
  return { tokens: new Set(tokenize(text)) };
}

interface Partition {
  coreLen: number;
  combinedALen: number;
  combinedBLen: number;
  core: string;
  combinedA: string;
  combinedB: string;
}

function partition(a: PreparedText, b: PreparedText): Partition {
  const intersection: string[] = [];
  const diffA: string[] = [];
  for (const token of a.tokens) {
    (b.tokens.has(token) ? intersection : diffA).push(token);
  }
  const diffB: string[] = [];
  for (const token of b.tokens) {
    if (!a.tokens.has(token)) diffB.push(token);
  }

  intersection.sort();
  diffA.sort();
  diffB.sort();

  const core = intersection.join(" ");
  const combinedA = [...intersection, ...diffA].join(" ");
  const combinedB = [...intersection, ...diffB].join(" ");

  return {
    core,
    combinedA,
    combinedB,
    coreLen: core.length,
    combinedALen: combinedA.length,
    combinedBLen: combinedB.length,
  };
}

/** min/max length ratio, which is what levenshteinRatio can never exceed. */
function lengthCeiling(x: number, y: number): number {
  const max = Math.max(x, y);
  if (max === 0) return 1;
  return Math.min(x, y) / max;
}

/**
 * Admissible upper bound on tokenSetRatioPrepared, computed from token-set
 * sizes alone with no Levenshtein pass.
 *
 * Sound because edit distance between two strings is at least their length
 * difference, so levenshteinRatio(x, y) <= min(|x|,|y|) / max(|x|,|y|). A
 * corpus sweep can therefore skip the O(n*m) scoring of any candidate whose
 * bound already falls below the best score found so far, and still return the
 * exact same argmax as scoring every candidate would have.
 */
export function tokenSetRatioUpperBound(a: PreparedText, b: PreparedText): number {
  const p = partition(a, b);
  return Math.max(
    lengthCeiling(p.coreLen, p.combinedALen),
    lengthCeiling(p.coreLen, p.combinedBLen),
    lengthCeiling(p.combinedALen, p.combinedBLen),
  );
}

/**
 * fuzzywuzzy-style token_set_ratio: robust to the claim quoting a subset of
 * the chunk (or the chunk containing extra surrounding prose) since it
 * compares the shared-token core against each side's leftover tokens,
 * independent of token order.
 *
 * Returns the exact ratio whenever it can exceed `floor`, and otherwise a
 * value that is <= floor and therefore cannot win a max. Passing the best
 * score found so far as the floor lets a corpus sweep skip work without
 * changing which chunk it picks.
 *
 * The two candidates involving `combinedB` are the expensive ones, since a
 * chunk is 500-800 tokens against a sentence's few dozen. They are also the
 * two whose length ceilings collapse in exactly that case, so per-candidate
 * pruning removes most of the cost of a realistic sweep rather than only the
 * cost of obviously-hopeless chunks.
 */
export function tokenSetRatioAtLeast(a: PreparedText, b: PreparedText, floor: number): number {
  const p = partition(a, b);

  const candidates = [
    { bound: lengthCeiling(p.coreLen, p.combinedALen), x: p.core, y: p.combinedA },
    { bound: lengthCeiling(p.coreLen, p.combinedBLen), x: p.core, y: p.combinedB },
    { bound: lengthCeiling(p.combinedALen, p.combinedBLen), x: p.combinedA, y: p.combinedB },
  ].sort((m, n) => n.bound - m.bound);

  let best = -1;
  for (const candidate of candidates) {
    if (candidate.bound <= Math.max(floor, best)) break;
    const ratio = levenshteinRatio(candidate.x, candidate.y);
    if (ratio > best) best = ratio;
  }

  return best < 0 ? candidates[0]!.bound : best;
}

export function tokenSetRatioPrepared(a: PreparedText, b: PreparedText): number {
  return tokenSetRatioAtLeast(a, b, -1);
}

export function tokenSetRatio(a: string, b: string): number {
  return tokenSetRatioPrepared(prepare(a), prepare(b));
}
