import type { CatalogPaper } from "./papers";

/**
 * The one-line description shown for a catalog paper.
 *
 * WHAT THIS FILE USED TO DO, AND WHY IT DOESN'T (issue #253). It procedurally
 * generated a whole "grounded read" for every /paper/[slug] page: three
 * pillars of claims, each with an evidence tier picked by arithmetic on a hash
 * of the paper id, a quote drawn from a five-item pool, a page number of
 * `(hash % 11) + 2`, and a match score of `0.92 + (hash % 8) / 100`.
 *
 * The catalog those pages render is real, checkable papers: AlphaFold, CRISPR,
 * Attention Is All You Need, ResNet. So /paper/highly-accurate-protein-
 * structure-prediction showed a claim cited to "Participants were randomly
 * assigned in a 1:1 ratio, with allocation concealed until after enrolment",
 * quote located, 0.97, p.7. AlphaFold has no participants and no
 * randomisation, that sentence is not in the paper, and the page number and
 * score were arithmetic. The standfirst directly above it promised "each claim
 * below is either bound to a quoted sentence from the source... Nothing here
 * is a summary you are asked to take on trust."
 *
 * For a product whose entire premise is that a claim is bound to a real
 * sentence, on its most linked-to public surface, that was the most damaging
 * thing in the repo. Anyone who knew one of these papers would see a quote
 * that is not in it.
 *
 * So there is no synthetic article any more. A paper page renders the metadata
 * that is actually true (title, authors, venue, year, source link) and an
 * explicit not-yet-indexed state. The real write-up arrives when the catalog
 * is genuinely put through the pipeline (issue #279), read from the same nodes
 * and evidence rows the reader reads (issue #283) rather than regenerated
 * here.
 *
 * What survives is this: a description that describes the *page*, not the
 * paper's findings. It asserts nothing about what any paper says.
 */

/**
 * Deterministic so the same paper gets the same line on the server and on the
 * client, and the feed does not reshuffle between renders.
 */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Every line here is about provenance and process, never about a finding.
 * That is the constraint: nothing in this file has read the paper, so nothing
 * in this file may characterise it.
 */
const DEKS = [
  "Indexed from the open-access source. Open it to read the original.",
  "Catalogued with its source link. A grounded write-up follows once it is indexed.",
  "Listed from its open-access record, not yet put through the verifier.",
  "In the library, with the original one click away.",
] as const;

export function paperDek(paper: CatalogPaper): string {
  return DEKS[hash(paper.id) % DEKS.length] as string;
}
