import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { MechanismDemo } from "@/components/site/MechanismDemo";
import { PacingStrip } from "@/components/site/PacingStrip";
import { Reveal } from "@/components/ui/Reveal";
import { buttonClassName } from "@/components/ui/Button";
import { ReadingColumn } from "@/components/reading/Article";
import { ReaderMock, AgentMock } from "@/components/mockups/ReaderMock";
import { LIVE_TOOLS } from "@/lib/mcp/registry";

/**
 * Landing page.
 *
 * Editorial rather than marketing-grid: one measure, hairline section breaks,
 * and a single idea per section. The previous version stacked seven bordered
 * bands of roughly equal weight, which flattened the argument, so nothing read
 * as more important than anything else.
 *
 * The argument runs: here is the problem, here is the mechanism, here is what
 * it looks like, here is what it cannot do, here is what it means for agents.
 * The limits section is deliberately on the landing page rather than buried, on
 * the grounds that a product about not overclaiming should not overclaim first.
 */

function Section({
  kicker,
  title,
  children,
  media,
  layout = "stack",
  revealVariant,
}: {
  kicker?: string;
  title: string;
  children: React.ReactNode;
  media?: React.ReactNode;
  /** "side-by-side" puts text and media in a two-column grid on larger
   *  screens instead of stacking media below -- a deliberate break from the
   *  repeating stack, used once (the mechanism section) rather than as a
   *  second copy-pasted template.
   *
   *  "media-wide" stacks like the default but lets the media break out past
   *  the reading column. The reading column is sized for prose, and a piece
   *  of media that is itself laid out in columns cannot also fit inside a
   *  measure meant for one. Used by the mechanism demo, which needs to put a
   *  claim and its source beside each other. */
  layout?: "stack" | "side-by-side" | "media-wide";
  revealVariant?: "lift" | "slide";
}) {
  const text = (
    <>
      {kicker && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          {kicker}
        </p>
      )}
      <h2 className="mt-s-3 max-w-2xl font-serif text-[1.75rem] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[2.1rem]">
        {title}
      </h2>
      <div className="mt-s-4 max-w-2xl font-sans text-[1.0625rem] leading-[1.75] text-ink-muted [&>*+*]:mt-s-4">
        {children}
      </div>
    </>
  );

  return (
    <Reveal variant={revealVariant}>
      <section className="border-t border-border py-s-6">
        <ReadingColumn wide>
          {layout === "side-by-side" && media ? (
            <div className="grid gap-s-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
              <div>{text}</div>
              <div>{media}</div>
            </div>
          ) : (
            <>
              {text}
              {media && layout !== "media-wide" && <div className="mt-s-6">{media}</div>}
            </>
          )}
        </ReadingColumn>

        {/* Outside ReadingColumn, so it is measured against the section rather
            than the prose measure. See the `layout` doc comment above. */}
        {layout === "media-wide" && media && (
          <div className="mx-auto mt-s-6 w-full max-w-4xl px-s-5">{media}</div>
        )}
      </section>
    </Reveal>
  );
}

export default function MarketingPage() {
  return (
    <main className="flex flex-col">
      <Hero />

      <Section kicker="What it is" title="Two things, in one place.">
        <p>
          <strong className="text-ink">A publication.</strong> Researchers post
          the papers they have read, with their own write-up. Readers follow
          people whose judgement they trust, and the library fills with papers
          someone has actually worked through rather than a search index.
        </p>
        <p>
          <strong className="text-ink">A summariser you can check.</strong> Each
          write-up is generated from the paper and then verified against it. Every
          claim shows the exact sentence it came from, at the page it came from,
          or says plainly that it has none.
        </p>
        <p>
          The second part is what makes the first part worth reading. A feed of
          AI summaries nobody can check is just a faster way to spread a
          misreading.
        </p>
      </Section>

      <Section
        kicker="The problem"
        title="You can't tell if a summary is accurate by reading it."
      >
        <p>
          Ask a model to summarise a paper and you get fluent prose that sounds
          exactly like the paper. Whether it is faithful is invisible from the
          output. The only way to check is to read the source, which is the work
          the summary was supposed to save.
        </p>
        <p>
          Pepiros does not ask you to trust its output. It shows you the sentence
          each claim came from, and tells you when there is no such sentence.
        </p>
      </Section>

      <Section
        kicker="The mechanism"
        title="Every claim is matched against its source sentence and scored."
        media={<MechanismDemo />}
        layout="media-wide"
        revealVariant="slide"
      >
        <p>
          Each claim is matched against the exact sentence it cites, and scored.
          Above 0.92 it is <strong className="text-ink">quote located</strong>{" "}
          and shows its quote, page and citation id. Between 0.75 and 0.92 it is{" "}
          <strong className="text-ink">paraphrase</strong>. Below that the anchor
          is dropped and the citation is stripped rather than left dangling.
        </p>
        <p>
          No second model grades the first one&apos;s work. A deterministic
          string match does that instead, so the same claim always gets the
          same score.
        </p>
      </Section>

      {/* Issue #247: still ReaderMock (grey skeleton bars) rather than a
          real screenshot -- the issue itself gates the swap on #228
          landing (real ingested papers replacing the fixture), which is
          blocked in this environment (needs the production Supabase
          project, IPv6-only and unreachable from this sandbox). Left as
          the honest wireframe rather than faked with a mockup that
          pretends to be a real capture. */}
      <Section
        kicker="What you read"
        title="The claim and its source, side by side."
        media={<ReaderMock />}
      >
        <p>
          A grounded claim sits next to its quote, not on top of a tooltip
          containing it. That is a deliberate choice: putting them adjacent is
          what lets you decide whether the claim actually follows.
        </p>
        <p>
          Claims with nothing behind them are labelled{" "}
          <strong className="text-ink">inference</strong> and carry no citation
          at all, rather than a hedge that looks like one.
        </p>
      </Section>

      <Section kicker="Ingest" title="No blank loading screen.">
        <p>
          The page is never a spinner. The skeleton graph appears first, then
          related work, then metadata, then the summary and pillars, then the
          rest of the generators.
        </p>
        {/* Issue #116: variant="full" adds a full sentence per stop, which
            at 5 columns wraps badly at every width under ~1400px -- and is
            largely redundant with the paragraph just above, which already
            narrates the same sequence. "teaser" (label + timing, the
            component's own documented intent for this page) reads cleaner
            and sidesteps the layout problem entirely rather than fixing
            breakpoints for content that repeats itself. */}
        <div className="mt-s-5 rounded-lg border border-border p-s-5">
          <PacingStrip />
        </div>
      </Section>

      <Section
        kicker="For agents"
        title="Your agent can check its own claims before it answers."
        media={<AgentMock />}
      >
        <p>
          Connect over MCP and your agent calls{" "}
          <code className="font-mono text-[0.95em] text-ink">verify_claim</code>{" "}
          on its own sentences before asserting them. When one comes back
          unsupported, it says so in the same breath.
        </p>
        <p>
          <Link
            href="/mcp"
            className="text-accent-text underline underline-offset-2"
          >
            See the {LIVE_TOOLS.length} tools
          </Link>
          .
        </p>
      </Section>

      <Section
        kicker="Limits"
        title="What this does not prove."
      >
        <p>
          A fuzzy-matched quote proves quotation provenance, not entailment. A
          model can attach a real Methods sentence to a wrong conclusion and
          still score 1.0 on the match.
        </p>
        <p>
          So the badge always reads <strong className="text-ink">quote
          located</strong>, and never <strong className="text-ink">verified</strong>.
          Saying that here, rather than in a footnote, is the point.
        </p>
      </Section>

      <Reveal>
        <section className="border-t border-border py-s-6">
          <ReadingColumn>
            <div className="text-center">
              <h2 className="font-serif text-[1.75rem] leading-snug text-ink">
                Browse papers other people have already read.
              </h2>
              <p className="mx-auto mt-s-3 max-w-md font-sans text-[15px] leading-relaxed text-ink-muted">
                The library is open. Every paper in it opens into a write-up
                where each claim sits next to its source.
              </p>
              <div className="mt-s-5 flex flex-wrap items-center justify-center gap-s-3">
                <Link href="/discover" className={buttonClassName("primary")}>
                  Browse the library
                </Link>
                <Link
                  href="/w/ws-1"
                  className={buttonClassName("secondary")}
                >
                  Try the demo workspace
                </Link>
              </div>
            </div>
          </ReadingColumn>
        </section>
      </Reveal>
    </main>
  );
}
