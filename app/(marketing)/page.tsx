import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Panel";

const EXAMPLE_PAPERS = [
  { title: "Morning Bright Light & Sleep Onset", note: "RCT, shift workers, 2022" },
  { title: "Circadian Disruption & Cognition", note: "Meta-analysis, 18 studies, 2021" },
  { title: "Sleep Deprivation & Executive Function", note: "Observational cohort, 2023" },
];

// Platform vision (docs/PLAN-V1.md §22) -- deliberately below the fold and
// visually quieter than the hero. Grounding-first per §22.4: the
// verification pitch is the whole hero, this is "where this is going," not
// a second headline. Marked "Coming soon" rather than presented as live --
// none of it is built in this pass (see the plan doc), and this is the
// actual demo a judge might click around in.
const PLATFORM_VISION = [
  { title: "Accounts", body: "Sign in, keep a library, publish papers under your name." },
  { title: "Publish & auto-graph", body: "Every published paper gets the same grounding spine, automatically." },
  { title: "Discover", body: "Browse, search, and follow papers and authors across the platform." },
  { title: "Discuss", body: "Comment on a paper, or on a specific claim, the way you'd annotate a margin." },
];

// Landing page: grounding-first per docs/PLAN-V1.md §22 -- the
// deterministic-verification pitch is the headline (matches the Aug 17 demo
// script, docs/PLAN-V1.md §16), platform ambition is a calmer section below
// the fold. Editorial Paper direction (design/DIRECTIONS.md). Static, one
// demo entry point into the seeded fixture workspace (ws-1) -- there's no
// real ingest pipeline wired up this pass.
export default function MarketingPage() {
  return (
    <main className="flex flex-col">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-24">
        <div className="flex flex-col gap-4">
          <Logo />
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Every claim, one click from its source.
          </h1>
          <p className="max-w-xl font-sans text-base leading-relaxed text-ink-muted">
            Pepiros turns a research PDF into a living knowledge graph. Every generated claim
            stays bound to the exact quoted sentence it came from &mdash; verified deterministically,
            never just asserted &mdash; and the same grounding is callable from any Claude
            conversation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/w/ws-1" className={buttonClassName("primary")}>
            Open the demo workspace
          </Link>
          <Link href="/w/ws-1/canvas" className={buttonClassName("secondary")}>
            Explore graph
          </Link>
        </div>

        <div className="grid gap-3 border-t border-border pt-8 sm:grid-cols-3">
          {EXAMPLE_PAPERS.map((paper) => (
            <Card key={paper.title} padded>
              <p className="font-serif text-sm text-ink">{paper.title}</p>
              <p className="mt-1 font-sans text-xs text-ink-faint">{paper.note}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface-sunken/40 px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Coming soon
            </p>
            <h2 className="mt-1 font-serif text-xl text-ink-muted">Where this is going</h2>
            <p className="mt-1 max-w-xl font-sans text-sm text-ink-faint">
              Pepiros is becoming a platform: publish your own papers, discover others&apos;, and
              discuss them &mdash; all on top of the same grounding spine above.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLATFORM_VISION.map((item) => (
              <div key={item.title}>
                <p className="font-sans text-sm font-medium text-ink-muted">{item.title}</p>
                <p className="mt-0.5 font-sans text-xs text-ink-faint">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
