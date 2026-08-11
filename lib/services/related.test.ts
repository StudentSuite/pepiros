import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetThrottleForTests, fetchRelatedPapers } from "./related";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  __resetThrottleForTests();
});

describe("fetchRelatedPapers", () => {
  it("resolves recommendations for a matched title", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ paperId: "abc123", title: "Match" }] }))
      .mockResolvedValueOnce(
        jsonResponse({
          recommendedPapers: [
            { title: "Related Paper A", tldr: { text: "A short summary." }, citationCount: 12, url: "https://x/a" },
            { title: "Related Paper B", citationCount: 3 },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRelatedPapers("Some Paper Title");

    expect(result.status).toBe("ok");
    expect(result.papers).toHaveLength(2);
    expect(result.papers[0]).toEqual({
      title: "Related Paper A",
      tldr: "A short summary.",
      citationCount: 12,
      url: "https://x/a",
    });
    // No url in the source -- falls back to a search link rather than an empty href.
    expect(result.papers[1]?.url).toContain("semanticscholar.org/search?q=Related%20Paper%20B");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns no_match when title search finds nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] })));

    const result = await fetchRelatedPapers("A Fictional Paper Title");

    expect(result).toEqual({ papers: [], status: "no_match" });
  });

  it("returns no_match when the matched paper has no recommendations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ paperId: "abc123", title: "Match" }] }))
      .mockResolvedValueOnce(jsonResponse({ recommendedPapers: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRelatedPapers("Some Paper Title");

    expect(result).toEqual({ papers: [], status: "no_match" });
  });

  it("classifies a 429 as rate_limited rather than a generic error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 429)));

    const result = await fetchRelatedPapers("Anything");

    expect(result).toEqual({ papers: [], status: "rate_limited" });
  });

  it("returns error on network failure without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("network down")),
    );

    const result = await fetchRelatedPapers("Anything");

    expect(result).toEqual({ papers: [], status: "error" });
  });

  // Semantic Scholar's keyed tier documents "1 request per second, cumulative
  // across all endpoints" -- a single call here makes two requests (search,
  // then recommendations) with nothing between them, which alone would
  // violate that without the throttle. Fake timers so this doesn't cost the
  // suite a real second.
  it("spaces the search and recommendations calls at least 1 second apart", async () => {
    vi.useFakeTimers();
    const callTimes: number[] = [];
    const fetchMock = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
      if (callTimes.length === 1) {
        return jsonResponse({ data: [{ paperId: "abc123", title: "Match" }] });
      }
      return jsonResponse({ recommendedPapers: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchRelatedPapers("Some Paper Title");
    await vi.runAllTimersAsync();
    await promise;

    expect(callTimes).toHaveLength(2);
    expect(callTimes[1]! - callTimes[0]!).toBeGreaterThanOrEqual(1000);

    vi.useRealTimers();
  });
});
