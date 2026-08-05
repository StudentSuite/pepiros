import Link from "next/link";

// Landing page: one-liner + core loop from plan.md §1. Static, dark "lab
// notebook at night" styling, one demo entry point into the seeded fixture
// workspace (ws-1) -- there's no real ingest pipeline wired up this pass.
export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Pepiros</p>
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Turn a research PDF into a living knowledge graph where every claim is bound to a
          located quote.
        </h1>
        <p className="max-w-xl font-sans text-base leading-relaxed text-ink-muted">
          Upload a paper. Read it beside its highlighted source. Ask a question and the answer
          becomes a new node. Every citation on screen resolves to a real, located quote, or is
          labelled honestly when it doesn&apos;t.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/w/ws-1"
          className="rounded bg-pillar-4/20 px-5 py-2.5 font-sans text-sm text-ink hover:bg-pillar-4/30"
        >
          Open the demo workspace
        </Link>
        <Link
          href="/w/ws-1/canvas"
          className="rounded border border-border-strong px-5 py-2.5 font-sans text-sm text-ink-muted hover:text-ink"
        >
          Explore graph
        </Link>
      </div>

      <div className="grid gap-3 border-t border-border pt-8 sm:grid-cols-3">
        {[
          {
            title: "Morning Bright Light & Sleep Onset",
            note: "RCT, shift workers, 2022",
          },
          {
            title: "Circadian Disruption & Cognition",
            note: "Meta-analysis, 18 studies, 2021",
          },
          {
            title: "Sleep Deprivation & Executive Function",
            note: "Observational cohort, 2023",
          },
        ].map((paper) => (
          <div key={paper.title} className="rounded border border-border bg-surface-raised p-4">
            <p className="font-serif text-sm text-ink">{paper.title}</p>
            <p className="mt-1 font-sans text-xs text-ink-faint">{paper.note}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
