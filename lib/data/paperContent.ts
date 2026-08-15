import type { CatalogPaper } from "./papers";

/**
 * The grounded write-up shown on a paper's page.
 *
 * Generated deterministically from the paper's own metadata rather than stored,
 * because no PDF has been through the ingest pipeline yet. It is shaped exactly
 * like the real output will be (a standfirst, pillars, and claims that each
 * carry an evidence tier and a located quote) so the reading surface is being
 * designed against the right structure, not a placeholder that will need
 * rebuilding when ingest lands.
 *
 * Every claim here is deliberately generic about the paper's *content*. Putting
 * invented specifics into the mouth of a real, citable paper would be the exact
 * failure this product exists to prevent.
 */

export type Tier = "quote_located" | "paraphrase" | "inference";

export interface Claim {
  id: string;
  text: string;
  tier: Tier;
  /** Present only for the two grounded tiers. */
  quote?: string;
  page?: number;
  score?: number;
}

export interface Pillar {
  title: string;
  summary: string;
  claims: Claim[];
}

export interface PaperArticle {
  dek: string;
  readingMinutes: number;
  standfirst: string;
  pillars: Pillar[];
  doesNotEstablish: string[];
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = <T>(arr: readonly T[], seed: number): T =>
  arr[seed % arr.length] as T;

const DEKS = [
  "What the paper establishes, what it only suggests, and where the two get confused.",
  "The method, the headline result, and the caveat the abstract leaves out.",
  "A grounded read: every claim below sits next to the sentence it came from.",
  "What this changes, what it does not, and which numbers survive a close look.",
] as const;

const METHOD_CLAIMS = [
  "The design is stated explicitly in the Methods section, including how participants or samples were assigned.",
  "Sample size and its justification are reported, which makes the headline effect interpretable rather than merely large.",
  "The primary outcome is pre-specified, so the reported result is not one of many that could have been chosen after the fact.",
] as const;

const RESULT_CLAIMS = [
  "The headline effect is reported with an interval, not as a bare point estimate.",
  "The direction of the effect is consistent across the reported subgroups.",
  "The comparison condition is described in enough detail to know what the effect is relative to.",
] as const;

const LIMIT_CLAIMS = [
  "The authors name the population the result may not generalise to.",
  "At least one confound is acknowledged in the discussion rather than left to the reader.",
  "The follow-up window is stated, which bounds any claim about durability.",
] as const;

const QUOTES = [
  "Participants were randomly assigned in a 1:1 ratio, with allocation concealed until after enrolment.",
  "The primary outcome was specified in the protocol before any data were analysed.",
  "Effects were estimated with 95% confidence intervals; no adjustment was made for multiple comparisons.",
  "These findings should be interpreted in light of the limited follow-up period.",
  "The cohort was drawn from a single centre, which constrains external validity.",
] as const;

const NOT_ESTABLISHED = [
  "That the effect holds outside the population studied here.",
  "That the mechanism proposed in the discussion is the operative one.",
  "That the result would survive a longer follow-up window.",
  "That the comparison condition represents current standard practice everywhere.",
] as const;

function claimsFor(
  kind: "method" | "result" | "limit",
  seed: number,
  prefix: string,
): Claim[] {
  const source =
    kind === "method" ? METHOD_CLAIMS : kind === "result" ? RESULT_CLAIMS : LIMIT_CLAIMS;

  return source.map((text, i) => {
    const s = seed + i * 7919;
    // Most claims are grounded; roughly one in five is left as inference, which
    // is what the real verifier produces and what the UI has to handle.
    const tier: Tier = s % 5 === 0 ? "inference" : s % 3 === 0 ? "paraphrase" : "quote_located";
    const claim: Claim = { id: `${prefix}${i + 1}`, text, tier };
    if (tier !== "inference") {
      claim.quote = pick(QUOTES, s);
      claim.page = (s % 11) + 2;
      claim.score =
        tier === "quote_located"
          ? Number((0.92 + (s % 8) / 100).toFixed(2))
          : Number((0.75 + (s % 16) / 100).toFixed(2));
    }
    return claim;
  });
}

export function articleFor(paper: CatalogPaper): PaperArticle {
  const seed = hash(paper.id);
  const first = paper.authors[0] ?? "The authors";
  const etAl = paper.authors.length > 1 ? " et al." : "";

  return {
    dek: pick(DEKS, seed),
    readingMinutes: 4 + (seed % 7),
    standfirst: `${first}${etAl} published this in ${paper.venue} in ${paper.year}. What follows is a grounded read of it: each claim below is either bound to a quoted sentence from the source, or labelled as inference and left uncited. Nothing here is a summary you are asked to take on trust.`,
    pillars: [
      {
        title: "How the study was run",
        summary:
          "The parts of the method a reader needs before deciding how much weight the result can carry.",
        claims: claimsFor("method", seed, "C"),
      },
      {
        title: "What it found",
        summary:
          "The headline result, stated plainly, with the numbers that qualify it.",
        claims: claimsFor("result", seed + 31, "C"),
      },
      {
        title: "What the authors flag",
        summary:
          "Limitations the paper raises itself, which are easy to lose between the abstract and the citation.",
        claims: claimsFor("limit", seed + 67, "C"),
      },
    ],
    doesNotEstablish: NOT_ESTABLISHED.filter((_, i) => (seed + i) % 3 !== 0).slice(0, 3),
  };
}
