import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCitationExpansion } from "./citationExpand";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCitationExpansion", () => {
  it("expands cited_by via the cites: filter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: "https://openalex.org/W1", display_name: "Root Paper", publication_year: 2020 }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: "https://openalex.org/W2",
              display_name: "Citing Paper",
              publication_year: 2022,
              authorships: [{ author: { display_name: "A. Author" } }, { author: {} }],
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCitationExpansion("Root Paper", "cited_by");

    expect(result.status).toBe("ok");
    expect(result.candidates).toEqual([
      {
        openalexId: "W2",
        title: "Citing Paper",
        authors: ["A. Author"],
        year: 2022,
        url: "https://openalex.org/W2",
        pdfUrl: null,
      },
    ]);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("filter=cites:W1");
  });

  it("surfaces best_oa_location.pdf_url as pdfUrl when OpenAlex has one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: "https://openalex.org/W1", display_name: "Root Paper", publication_year: 2020 }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: "https://openalex.org/W2",
              display_name: "Open Access Paper",
              publication_year: 2021,
              best_oa_location: { pdf_url: "https://example.com/paper.pdf" },
              open_access: { is_oa: true, oa_url: "https://example.com/landing" },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCitationExpansion("Root Paper", "cited_by");

    expect(result.candidates[0]?.pdfUrl).toBe("https://example.com/paper.pdf");
  });

  it("expands cites via the resolved work's referenced_works", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: "https://openalex.org/W1",
              display_name: "Root Paper",
              publication_year: 2020,
              referenced_works: ["https://openalex.org/W10", "https://openalex.org/W11"],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { id: "https://openalex.org/W10", display_name: "Cited Paper A", publication_year: 2015 },
            { id: "https://openalex.org/W11", display_name: "Cited Paper B", publication_year: 2016 },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCitationExpansion("Root Paper", "cites");

    expect(result.status).toBe("ok");
    expect(result.candidates.map((c) => c.title)).toEqual(["Cited Paper A", "Cited Paper B"]);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("filter=openalex_id:W10|W11");
  });

  it("returns no_match when the title search finds nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ results: [] })));

    const result = await fetchCitationExpansion("A Fictional Paper Title", "cited_by");

    expect(result).toEqual({ candidates: [], status: "no_match" });
  });

  it("returns no_match for cites direction when the work has no referenced_works", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: "https://openalex.org/W1", display_name: "Root Paper", publication_year: 2020 }],
        }),
      ),
    );

    const result = await fetchCitationExpansion("Root Paper", "cites");

    expect(result).toEqual({ candidates: [], status: "no_match" });
  });

  it("classifies a 429 as rate_limited", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 429)));

    const result = await fetchCitationExpansion("Anything", "cited_by");

    expect(result).toEqual({ candidates: [], status: "rate_limited" });
  });

  it("returns error on network failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));

    const result = await fetchCitationExpansion("Anything", "cited_by");

    expect(result).toEqual({ candidates: [], status: "error" });
  });
});
