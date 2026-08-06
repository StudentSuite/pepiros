// OpenAlex API client. Free, no key. "What cites this" / "what this cites" for a paper not necessarily in the
// workspace. Returns ghost-node candidates for canvas-edge expansion (plan.md "New features"). A selected ghost node
// would be passed to lib/services/ingest.ts to become a real paper -- that pipeline doesn't exist yet, so there is no
// write path here, only discovery.
import { classifyExternalError, fetchJson, type ExternalApiStatus } from "./externalFetch";

export type CitationDirection = "cites" | "cited_by";

export interface GhostCitationCandidate {
  openalexId: string;
  title: string;
  authors: string[];
  year: number | null;
  url: string;
}

export interface CitationExpansionResult {
  candidates: GhostCitationCandidate[];
  status: "ok" | "no_match" | ExternalApiStatus;
}

const WORKS_URL = "https://api.openalex.org/works";

interface OpenAlexWork {
  id: string;
  display_name: string;
  publication_year: number | null;
  referenced_works?: string[];
  authorships?: Array<{ author?: { display_name?: string } }>;
}

interface OpenAlexSearchResponse {
  results?: OpenAlexWork[];
}

function shortId(fullId: string): string {
  return fullId.replace("https://openalex.org/", "");
}

/**
 * Appends OpenAlex's "polite pool" identifier when configured (.env.example's
 * OPENALEX_MAILTO) -- an unauthenticated request without it lands in the
 * shared anonymous pool, which is the pool observed returning a 503 under
 * load while building this (lib/services/externalFetch.ts's
 * classifyExternalError). Not a credential, just an identifier OpenAlex asks
 * for in exchange for a separate, less contended rate limit.
 */
function withMailto(url: string): string {
  const mailto = process.env.OPENALEX_MAILTO;
  return mailto ? `${url}&mailto=${encodeURIComponent(mailto)}` : url;
}

function toCandidate(work: OpenAlexWork): GhostCitationCandidate {
  return {
    openalexId: shortId(work.id),
    title: work.display_name,
    authors: (work.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter((name): name is string => Boolean(name)),
    year: work.publication_year,
    url: work.id,
  };
}

/**
 * Resolves `title` to an OpenAlex work via title search, then expands one
 * hop in the requested direction: `cites` walks the resolved work's own
 * `referenced_works`, `cited_by` queries OpenAlex's `cites:` filter for
 * works that reference it. A fictional title (e.g. the bundled fixture's
 * papers) legitimately resolves to `no_match` -- there is nothing to fake.
 */
export async function fetchCitationExpansion(
  title: string,
  direction: CitationDirection,
  limit = 5,
): Promise<CitationExpansionResult> {
  let work: OpenAlexWork | undefined;
  try {
    const searchUrl = `${WORKS_URL}?search=${encodeURIComponent(title)}&per-page=1`;
    const search = await fetchJson<OpenAlexSearchResponse>(withMailto(searchUrl));
    work = search.results?.[0];
  } catch (err) {
    return { candidates: [], status: classifyExternalError(err) };
  }

  if (!work) return { candidates: [], status: "no_match" };

  try {
    if (direction === "cited_by") {
      const url = withMailto(`${WORKS_URL}?filter=cites:${shortId(work.id)}&per-page=${limit}`);
      const result = await fetchJson<OpenAlexSearchResponse>(url);
      const candidates = (result.results ?? []).map(toCandidate);
      return { candidates, status: candidates.length ? "ok" : "no_match" };
    }

    const referencedIds = (work.referenced_works ?? []).slice(0, limit).map(shortId);
    if (referencedIds.length === 0) return { candidates: [], status: "no_match" };

    const url = withMailto(`${WORKS_URL}?filter=openalex_id:${referencedIds.join("|")}&per-page=${limit}`);
    const result = await fetchJson<OpenAlexSearchResponse>(url);
    const candidates = (result.results ?? []).map(toCandidate);
    return { candidates, status: candidates.length ? "ok" : "no_match" };
  } catch (err) {
    return { candidates: [], status: classifyExternalError(err) };
  }
}
