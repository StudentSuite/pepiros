import { Panel } from "@/components/ui/Panel";

interface PlaceholderRelatedPaper {
  title: string;
  tldr: string;
  citationCount: number;
  url: string;
}

// Illustrative only -- lib/services/related.ts (Semantic Scholar fetch, plan.md
// §6.1) is still a stub, so these are static placeholder cards, not live data.
const PLACEHOLDER_RELATED: PlaceholderRelatedPaper[] = [
  {
    title: "Light Therapy for Circadian Realignment in Night-Shift Nurses",
    tldr: "A smaller RCT replicating a bright-light protocol in a different shift-worker population, similar effect direction.",
    citationCount: 42,
    url: "https://www.semanticscholar.org/",
  },
  {
    title: "Sleep Restriction and Working Memory: A Systematic Review",
    tldr: "Reviews 26 studies on acute sleep restriction and working memory; finds effects concentrated in chronic rather than single-night deprivation.",
    citationCount: 118,
    url: "https://www.semanticscholar.org/",
  },
  {
    title: "Actigraphy vs. Polysomnography in Occupational Cohorts",
    tldr: "Methods comparison relevant to how sleep duration was measured in the observational cohort study in this workspace.",
    citationCount: 27,
    url: "https://www.semanticscholar.org/",
  },
];

/**
 * Right-rail on the default doc-reader view. No Semantic Scholar integration
 * exists yet (lib/services/related.ts is a stub) -- these are static
 * placeholder cards standing in for what a live fetch would populate in
 * <1s, no LLM involved (plan.md §1's pacing).
 */
export function RelatedPapersRail() {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-[11px] uppercase tracking-wide text-ink-faint">
        Related papers
      </h3>
      <ul className="flex flex-col gap-2">
        {PLACEHOLDER_RELATED.map((paper) => (
          <li key={paper.title}>
            <Panel className="p-3">
              <a
                href={paper.url}
                target="_blank"
                rel="noreferrer"
                className="font-serif text-sm text-ink hover:underline"
              >
                {paper.title}
              </a>
              <p className="mt-1 font-sans text-xs text-ink-muted">{paper.tldr}</p>
              <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
                {paper.citationCount} citations (illustrative)
              </p>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}
