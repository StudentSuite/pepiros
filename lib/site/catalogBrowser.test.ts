import { describe, expect, it } from "vitest";
import type { CatalogPaper } from "@/lib/data/papers";
import { fieldsPresentIn, filterByField } from "./catalogBrowser";

function paper(overrides: Partial<CatalogPaper> & Pick<CatalogPaper, "id" | "field">): CatalogPaper {
  return {
    slug: overrides.id,
    title: "Title",
    authors: ["Author"],
    year: 2020,
    venue: "Venue",
    licence: "arxiv-perpetual",
    sourceUrl: "https://example.com",
    ...overrides,
  };
}

describe("fieldsPresentIn", () => {
  it("lists each field once, in first-appearance order", () => {
    const papers = [
      paper({ id: "a", field: "Machine learning" }),
      paper({ id: "b", field: "Genomics" }),
      paper({ id: "c", field: "Machine learning" }),
    ];
    expect(fieldsPresentIn(papers)).toEqual(["Machine learning", "Genomics"]);
  });

  it("returns an empty list for an empty catalog", () => {
    expect(fieldsPresentIn([])).toEqual([]);
  });
});

describe("filterByField", () => {
  const papers = [
    paper({ id: "a", field: "Machine learning" }),
    paper({ id: "b", field: "Genomics" }),
  ];

  it("returns every paper when no field is selected", () => {
    expect(filterByField(papers, null)).toEqual(papers);
  });

  it("returns only papers in the selected field", () => {
    expect(filterByField(papers, "Genomics")).toEqual([papers[1]]);
  });

  it("returns an empty list for a field nothing in the catalog has", () => {
    expect(filterByField(papers, "Physics")).toEqual([]);
  });
});
