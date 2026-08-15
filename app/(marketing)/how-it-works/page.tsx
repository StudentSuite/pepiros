import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PacingStrip } from "@/components/site/PacingStrip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { ReaderMock, GraphMock, AgentMock } from "@/components/mockups/ReaderMock";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Deterministic checking, not a model's opinion of itself. Every claim is matched against the exact source sentence with a fuzzy-match score.",
};

const WORKED_CLAIM =
  "Morning bright light advances circadian phase by about 1.4 hours in shift workers.";
const WORKED_QUOTE =
  "Participants receiving 30 minutes of 10,000 lux morning light advanced dim-light melatonin onset by 1.4 hours (95% CI 0.9-1.9) after five days.";
const WORKED_SCORE = 0.97;

const LIMITATIONS = [
  "A fuzzy-matched quote proves quotation provenance, not entailment.",
  "A model can attach a real Methods sentence to a wrong conclusion and still score 1.0 on the match.",
  "The badge always reads quote located, and never reads verified.",
  "Claim and quote render next to each other on purpose, so the reader adjudicates entailment rather than the matcher.",
];

/**
 * Stepped, media-led walkthrough.
 *
 * Each step alternates a column of prose against a mockup of the surface being
 * described, so the page shows the product rather than only asserting things
 * about it. The mockups are code-composed from the design tokens rather than
 * screenshots, so they follow the theme and cannot drift from the palette.
 */
function Step({
  index,
  kicker,
  title,
  children,
  media,
  flip = false,
}: {
  index: number;
  kicker: string;
  title: string;
  children: React.ReactNode;
  media: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <Reveal>
      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-s-7 px-6 py-s-8 lg:grid-cols-2">
          <div className={flip ? "lg:order-2" : undefined}>
            <div className="flex items-center gap-s-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border font-mono text-[11px] text-ink-faint">
                {index}
              </span>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
                {kicker}
              </p>
            </div>
            <h2 className="mt-s-4 font-serif text-2xl leading-snug text-ink sm:text-3xl">
              {title}
            </h2>
            <div className="mt-s-4 flex flex-col gap-s-3 font-sans text-base leading-relaxed text-ink-muted">
              {children}
            </div>
          </div>
          <div className={flip ? "lg:order-1" : undefined}>{media}</div>
        </div>
      </section>
    </Reveal>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-s-7 pt-s-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          How it works
        </p>
        <h1 className="mt-s-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Checked against the source, not asked of a model twice.
        </h1>
        <p className="mx-auto mt-s-4 max-w-xl font-sans text-base leading-relaxed text-ink-muted">
          Every claim is matched against the exact sentence it cites, with a
          score you can see. No second model is asked whether the first one was
          telling the truth.
        </p>
      </section>

      <Step
        index={1}
        kicker="Ingest"
        title="A paper becomes a graph, in stages you can watch."
        media={
          <div className="rounded-lg border border-border bg-surface-raised p-s-5">
            <PacingStrip variant="full" />
          </div>
        }
      >
        <p>
          Structure appears before any model has run, so the page is never a
          spinner. The skeleton graph lands first, then related work, then
          metadata, then the summary and pillars, then the remaining generators.
        </p>
      </Step>

      <Step
        index={2}
        kicker="Structure"
        title="Sections come from the paper, not from a fixed template."
        flip
        media={<GraphMock />}
      >
        <p>
          A clinical trial and a machine-learning paper do not have the same
          shape, so they do not get the same headings. Pepiros classifies the
          paper first and plans its pillars from the content.
        </p>
        <p>
          Every leaf under a pillar carries its own evidence, which is what makes
          the graph navigable rather than decorative.
        </p>
      </Step>

      <Step
        index={3}
        kicker="Grounding"
        title="The claim and its source sit side by side."
        media={<ReaderMock />}
      >
        <p>
          A claim that cleared the match shows its badge, its citation id, and
          its score, and the sentence it came from is highlighted in the source
          pane next to it.
        </p>
        <p>
          A claim with nothing checked behind it is labelled{" "}
          <span className="text-ink">inference</span> and gets no citation at
          all, rather than a hedge.
        </p>
      </Step>

      {/* Worked example */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-s-8">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Worked example
            </p>
            <h2 className="mt-s-4 font-serif text-2xl text-ink">One claim, scored</h2>

            <div className="mt-s-5 rounded-lg border border-border bg-paper p-s-5">
              <p className="font-serif text-base leading-snug text-ink">
                {WORKED_CLAIM}
              </p>

              <div className="mt-s-4 border-t border-border pt-s-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  Source excerpt
                </p>
                <p className="mt-s-2 font-serif text-sm leading-relaxed text-ink-muted">
                  {WORKED_QUOTE}
                </p>
              </div>
            </div>

            {/* Threshold bar */}
            <div className="mt-s-6">
              <div className="relative h-2 rounded-full bg-surface-raised ring-1 ring-border">
                <div
                  className="absolute inset-y-0 left-0 rounded-l-full bg-pillar-5/35"
                  style={{ width: "75%" }}
                />
                <div
                  className="absolute inset-y-0 rounded-none bg-pillar-2/45"
                  style={{ left: "75%", width: "17%" }}
                />
                <div
                  className="absolute inset-y-0 right-0 rounded-r-full bg-pillar-7/45"
                  style={{ left: "92%" }}
                />
                <div
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper"
                  style={{ left: `${WORKED_SCORE * 100}%` }}
                />
              </div>
              <div className="mt-s-2 flex justify-between font-mono text-[10px] text-ink-faint">
                <span>0.0 dropped</span>
                <span>0.75 paraphrase</span>
                <span>0.92 quote located</span>
              </div>
            </div>

            <div className="mt-s-5 flex flex-wrap items-center gap-s-3">
              <EvidenceBadge tier="quote_located" />
              <RefChip refId="C7" />
              <span className="font-mono text-xs text-ink-muted">
                score {WORKED_SCORE}
              </span>
            </div>
          </div>
        </section>
      </Reveal>

      <Step
        index={4}
        kicker="For agents"
        title="An agent can check its own claims, mid-answer."
        flip
        media={<AgentMock />}
      >
        <p>
          Connect over MCP and the agent calls{" "}
          <code className="font-mono text-sm text-ink">verify_claim</code> on its
          own sentences before it asserts them to you.
        </p>
        <p>
          When one comes back unsupported, it says so, in the same answer. That
          is the whole point:{" "}
          <Link href="/mcp" className="text-accent-text underline underline-offset-2">
            see the MCP tools
          </Link>
          .
        </p>
      </Step>

      {/* Limits */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-s-8">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Said on stage, not just in the docs
            </p>
            <h2 className="mt-s-4 font-serif text-2xl text-ink">
              What this does not prove
            </h2>
            <ul className="mt-s-5 flex flex-col gap-s-3">
              {LIMITATIONS.map((l) => (
                <li
                  key={l}
                  className="flex gap-s-3 font-sans text-base leading-relaxed text-ink-muted"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-pillar-6" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="mt-s-5 font-sans text-base leading-relaxed text-ink-muted">
              An entailment overlap floor helps: every number, unit, and
              comparator in a claim also has to appear in the anchored span,
              checked against the numeric ledger. That catches the failure a
              fuzzy match alone misses, a genuine quote attached to a reversed or
              overstated conclusion.
            </p>
          </div>
        </section>
      </Reveal>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-s-3 px-6 py-s-8">
          <Link href="/login?next=%2Fw%2Fws-1" className={buttonClassName("primary")}>
            Try the demo workspace
          </Link>
          <Link href="/docs" className={buttonClassName("secondary")}>
            Read the docs
          </Link>
        </div>
      </section>
    </main>
  );
}
