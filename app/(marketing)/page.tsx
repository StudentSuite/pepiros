import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { PillarChip } from "@/components/ui/PillarChip";
import { Reveal } from "@/components/ui/Reveal";
import { PacingStrip } from "@/components/site/PacingStrip";
import { VerificationDemo } from "@/components/site/VerificationDemo";
import { Hero } from "@/components/site/Hero";
import { PreviewCard } from "@/components/site/PreviewCard";

// Platform preview (docs/PLAN-V1.md §22.1), deliberately smaller and quieter
// than every section above per the positioning rule (plan.md §10 / §12,
// docs/PLAN-V1.md §22.4): the grounding pitch is the whole hero, this is
// "where this is going," never a second headline. Four items per the task
// brief, compressing §22.1's fuller 7-item feature list.
const PLATFORM_PREVIEW = [
  { title: "Publish", body: "auto-graph runs the moment you publish, no manual step." },
  { title: "Discover", body: "browse, search, and sort a public, curated library." },
  { title: "Discuss", body: "comment on a paper, or on one specific claim." },
  { title: "Follow", body: "follow authors and papers, keep track of what matters." },
] as const;

// Personas, docs/PLAN-V1.md §1.5. Real success signals from that table,
// trimmed to a short hook rather than invented copy.
const PERSONAS = [
  { role: "Grad student", hook: "explains the method aloud after 20 minutes" },
  { role: "Researcher", hook: "finds the limitation they'd have missed" },
  { role: "Clinician", hook: "gets to “does this change practice?” fast" },
  { role: "Educator", hook: "exports evidence-backed flashcards for class" },
] as const;

// Illustrative placeholder for the canvas preview -- there's no real
// screenshot asset yet, so this stands in for "one paper becomes a
// pillar-organized graph" using the same PillarChip system the real canvas
// uses (plan.md §10), not a generic loading skeleton.
const FAN_OUT_NODES = [
  { pillarIndex: 1, label: "Methods" },
  { pillarIndex: 3, label: "Results" },
  { pillarIndex: 5, label: "Limitations" },
  { pillarIndex: 7, label: "Applications" },
] as const;

function CanvasFanOutPreview() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-sunken px-6">
      <PillarChip pillarIndex={null} label="Paper" />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {FAN_OUT_NODES.map((node) => (
          <PillarChip key={node.label} pillarIndex={node.pillarIndex} label={node.label} />
        ))}
      </div>
    </div>
  );
}

// Landing page, full replace (frontend v1 plan, Task 3). Grounding-first per
// the positioning rule (plan.md §10, docs/PLAN-V1.md §22.4): the
// deterministic-verification pitch is the entire hero and the "For agents"
// band, platform ambition is a calmer, visibly smaller section below the
// fold. Editorial Paper direction (design/DIRECTIONS.md). Nine sections,
// header/footer excluded (those come from app/(marketing)/layout.tsx):
// hero -> pacing strip -> canvas preview -> grounding trust band -> For
// Claude band (always visible, not scroll-revealed) -> platform preview ->
// personas strip.
export default function MarketingPage() {
  return (
    <main className="flex flex-col">
      {/* Hero. Full-bleed art with the copy over its calm upper third; see
          components/site/Hero.tsx. Not wrapped in Reveal -- it's the first
          thing on screen, there's nothing to scroll-trigger. */}
      <Hero />

      {/* The showpiece moved out of the hero: it was competing with the art for
          the same screen, and it reads better as the first thing you meet after
          scrolling past the headline. */}
      <section className="mx-auto w-full max-w-5xl px-6 py-s-8">
        <VerificationDemo />
      </section>

      {/* Pacing strip teaser -- plan.md §1's real ingest sequence. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="mb-6 font-mono text-xs uppercase tracking-widest text-ink-faint">
              What happens when you upload
            </p>
            <PacingStrip variant="teaser" />
          </div>
        </section>
      </Reveal>

      {/* Canvas preview -- no screenshot asset yet, PreviewCard's illustrative
          placeholder slot stands in for one instead of pointing at a file
          that doesn't exist. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <h2 className="font-serif text-2xl text-ink">See the graph take shape</h2>
            <p className="mt-2 max-w-xl font-sans text-sm text-ink-muted">
              One paper becomes a pillar-organized graph: pillars, leaves, and every citation
              under them, each still one click from its located quote.
            </p>
            <div className="mt-6">
              <PreviewCard
                href="/login?next=%2Fw%2Fws-1%2Fcanvas"
                kicker="The canvas"
                pitch="Explore the graph, one paper at a time"
              >
                <CanvasFanOutPreview />
              </PreviewCard>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Grounding trust band -- the two-tier framing, plan.md §4. The right
          card is deliberately bare (no citation, no excerpt): "inference"
          means a claim hasn't been checked against a source at all, which is
          the honest contrast to the left card, not just a different color. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Grounding, not vibes
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">Two tiers, always labeled</h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded border border-border bg-surface-raised p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceBadge tier="quote_located" />
                  <RefChip refId="C7" />
                </div>
                <p className="font-serif text-sm leading-relaxed text-ink">
                  &ldquo;Morning bright light advances circadian phase by about 1.4 hours in shift
                  workers.&rdquo;
                </p>
                <div className="border-t border-border pt-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    Source excerpt
                  </p>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-ink-faint">
                    &ldquo;Participants receiving 30 minutes of 10,000 lux morning light advanced
                    dim-light melatonin onset by 1.4 hours (95% CI 0.9&ndash;1.9) after five
                    days.&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded border border-border bg-surface-raised p-4">
                <Badge dotClassName="bg-inference" className="text-ink-muted">
                  inference
                </Badge>
                <p className="font-serif text-sm leading-relaxed text-ink">
                  &ldquo;This kind of light exposure is generally the most effective circadian
                  intervention available.&rdquo;
                </p>
                <div className="border-t border-border pt-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    No source excerpt
                  </p>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-ink-faint">
                    Model output, not yet checked against a source. No citation, no excerpt,
                    until it&apos;s run back through the verifier.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex max-w-2xl flex-col gap-2">
              <p className="font-sans text-sm leading-relaxed text-ink-muted">
                Every number, unit, and comparator in a claim also has to show up in the anchored
                span (the entailment-overlap floor), which catches a real quote attached to a
                reversed or overstated conclusion.
              </p>
              <p className="font-sans text-sm leading-relaxed text-ink-muted">
                A fuzzy-matched quote proves quotation, not entailment, which is why the badge
                always reads quote located and never reads verified.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* For agents band. Deliberately NOT wrapped in Reveal -- always
          visible, per the design plan, not scroll-triggered. Full-bleed
          teal (pillar-7) tint, reduced opacity, no scroll gate on the MCP
          pitch. Mini-transcript mirrors the real demo beat, plan.md §7. */}
      <section className="relative border-t border-border">
        <div className="absolute inset-0 bg-pillar-7/10" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 sm:py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">For agents</p>
          <h2 className="max-w-xl font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Turn your coding agent into a fact-checker with a source.
          </h2>
          <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
            Connect over MCP and your agent can check its own claims against the source, live,
            mid-conversation, before it ever asserts them to you. Works with Codex, Claude, and
            Cursor today.
          </p>

          <div className="mt-2 max-w-lg rounded-lg border border-border-strong bg-surface-raised/90 p-s-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Inside an agent conversation
            </p>
            <p className="font-mono text-xs leading-relaxed text-ink-muted sm:text-sm">
              <span className="text-ink-faint">Agent: </span>
              &ldquo;This effect eliminates the need for melatonin supplementation entirely.&rdquo;
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-ink-faint sm:text-sm">
              <Badge variant="tag">verify_claim</Badge>
              <span>checks it against C7, live</span>
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm">
              <EvidenceBadge tier="unsupported" />
              <span className="text-ink-muted">The agent says so, out loud, mid-answer.</span>
            </p>
          </div>

          <div>
            <Link href="/mcp" className={buttonClassName("primary")}>
              See the MCP tools
            </Link>
          </div>
        </div>
      </section>

      {/* Platform preview -- deliberately smaller and quieter than every
          section above (positioning rule, plan.md §10 / docs/PLAN-V1.md
          §22.4). Substance carried forward from the old page's
          PLATFORM_VISION list, restyled down, not deleted. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-12">
            <h2 className="font-serif text-lg text-ink-muted">Where this is going</h2>
            <p className="mt-1 max-w-lg font-sans text-xs text-ink-faint">
              Pepiros is becoming a platform on top of the same grounding spine above: publish,
              discover, discuss.
            </p>
            <ul className="mt-4 flex flex-col gap-1.5 text-xs sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-1.5">
              {PLATFORM_PREVIEW.map((item) => (
                <li key={item.title} className="font-sans leading-relaxed text-ink-faint">
                  <span className="font-medium text-ink-muted">{item.title}:</span> {item.body}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* Personas strip -- docs/PLAN-V1.md §1.5. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-12">
            <h2 className="font-serif text-lg text-ink-muted">Built to be read by</h2>
            <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
              {PERSONAS.map((persona, index) => (
                <li
                  key={persona.role}
                  className={
                    index > 0
                      ? "flex-1 border-t border-border pt-3 text-xs sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
                      : "flex-1 text-xs"
                  }
                >
                  <span className="font-sans text-sm text-ink">{persona.role}:</span>{" "}
                  <span className="font-sans text-ink-faint">{persona.hook}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
