/**
 * Shared fetch helper for the two free, no-key external APIs this project
 * calls (Semantic Scholar, OpenAlex). Both are best-effort enrichment, never
 * on the grounding-spine's critical path, so every caller needs the same
 * three things: a hard timeout (an ingest-time or reader-time fetch must not
 * hang the request), a typed status on failure so callers can distinguish
 * "rate limited" from "no match" from "network error," and no silent
 * fallback data -- an external API failing should surface as an honest empty
 * state, not fabricated placeholder content standing in for it.
 */

export type ExternalApiStatus = "rate_limited" | "error";

export class ExternalApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ExternalApiError";
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ExternalApiError(`${url} -> HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 429 is the obvious rate-limit signal, but OpenAlex's anonymous-search tier
 * also returns a plain 503 ("search cluster recovering from heavy load,
 * retry shortly") with a Retry-After header when it's overloaded rather than
 * quota-limiting a specific caller -- observed directly against the live API
 * while building this. Both mean the same thing to a caller: transient,
 * retry later, not a real failure.
 */
export function classifyExternalError(err: unknown): ExternalApiStatus {
  if (err instanceof ExternalApiError && (err.status === 429 || err.status === 503)) {
    return "rate_limited";
  }
  return "error";
}
