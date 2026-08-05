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

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/**
 * fuzzywuzzy-style token_set_ratio: robust to the claim quoting a subset of
 * the chunk (or the chunk containing extra surrounding prose) since it
 * compares the shared-token core against each side's leftover tokens,
 * independent of token order.
 */
export function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  const intersection = [...tokensA].filter((t) => tokensB.has(t)).sort();
  const diffA = [...tokensA].filter((t) => !tokensB.has(t)).sort();
  const diffB = [...tokensB].filter((t) => !tokensA.has(t)).sort();

  const core = intersection.join(" ");
  const combinedA = [...intersection, ...diffA].join(" ");
  const combinedB = [...intersection, ...diffB].join(" ");

  const candidates = [
    levenshteinRatio(core, combinedA),
    levenshteinRatio(core, combinedB),
    levenshteinRatio(combinedA, combinedB),
  ];
  return Math.max(...candidates);
}
