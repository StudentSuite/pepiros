// Semantic Scholar Recommendations API client. Free, no key. Powers the Related Papers rail (plan.md "New features") --
// the first thing to populate after the skeleton graph (<1s, no LLM).
import { classifyExternalError, fetchJson, type ExternalApiStatus } from "./externalFetch";

export interface RelatedPaper {
  title: string;
  tldr: string | null;
  citationCount: number;
  url: string;
}

export interface RelatedPapersResult {
  papers: RelatedPaper[];
  status: "ok" | "no_match" | ExternalApiStatus;
}

const SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const RECOMMENDATIONS_URL = "https://api.semanticscholar.org/recommendations/v1/papers/forpaper";

interface S2SearchResponse {
  data?: Array<{ paperId: string; title: string }>;
}

interface S2RecommendedPaper {
  title: string;
  tldr?: { text: string } | null;
  citationCount?: number;
  url?: string;
}

interface S2RecommendationsResponse {
  recommendedPapers?: S2RecommendedPaper[];
}

/**
 * Semantic Scholar's key is genuinely optional (.env.example) -- unauthenticated
 * access is enough for a demo -- but attaching it when present moves a caller
 * out of the shared anonymous rate limit, the same 429/503 class this project
 * already treats as `rate_limited` (lib/services/externalFetch.ts).
 */
function apiKeyHeaders(): Record<string, string> {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  return key ? { "x-api-key": key } : {};
}

/**
 * Resolves `title` to a Semantic Scholar paper id via title search, then
 * calls the Recommendations API for similar papers. There's no live corpus
 * behind this yet, so a title with no Semantic Scholar match (e.g. every
 * paper in the bundled fixture, which is fictional) legitimately returns
 * `no_match` -- that's not a bug, it's this function refusing to
 * fabricate a result.
 */
export async function fetchRelatedPapers(title: string, limit = 3): Promise<RelatedPapersResult> {
  let paperId: string | undefined;
  try {
    const searchUrl = `${SEARCH_URL}?query=${encodeURIComponent(title)}&limit=1&fields=title`;
    const search = await fetchJson<S2SearchResponse>(searchUrl, { headers: apiKeyHeaders() });
    paperId = search.data?.[0]?.paperId;
  } catch (err) {
    return { papers: [], status: classifyExternalError(err) };
  }

  if (!paperId) return { papers: [], status: "no_match" };

  try {
    const recUrl = `${RECOMMENDATIONS_URL}/${paperId}?fields=title,tldr,citationCount,url&limit=${limit}`;
    const recommendations = await fetchJson<S2RecommendationsResponse>(recUrl, { headers: apiKeyHeaders() });

    const papers = (recommendations.recommendedPapers ?? []).map(
      (p): RelatedPaper => ({
        title: p.title,
        tldr: p.tldr?.text ?? null,
        citationCount: p.citationCount ?? 0,
        url: p.url ?? `https://www.semanticscholar.org/search?q=${encodeURIComponent(p.title)}`,
      }),
    );

    return { papers, status: papers.length ? "ok" : "no_match" };
  } catch (err) {
    return { papers: [], status: classifyExternalError(err) };
  }
}
