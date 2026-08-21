import type { CatalogPaper } from "@/lib/data/papers";
import type { ResearchField } from "@/lib/data/types";

/**
 * Pure helpers behind the homepage's discipline-chip filter (issue #296).
 * Fields are derived from the real catalog rather than the full
 * RESEARCH_FIELDS list, so a chip is never offered for a field nothing in
 * the catalog actually has.
 */
export function fieldsPresentIn(papers: CatalogPaper[]): ResearchField[] {
  return [...new Set(papers.map((p) => p.field))];
}

export function filterByField(papers: CatalogPaper[], field: ResearchField | null): CatalogPaper[] {
  return field ? papers.filter((p) => p.field === field) : papers;
}
