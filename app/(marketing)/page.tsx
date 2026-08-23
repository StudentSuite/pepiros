import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { SourceStrip } from "@/components/site/SourceStrip";
import { CapabilityCards } from "@/components/site/CapabilityCards";
import { MechanismDemo } from "@/components/site/MechanismDemo";
import { DisciplineGrid } from "@/components/site/DisciplineGrid";
import { CapabilityTabs } from "@/components/site/CapabilityTabs";
import { NewsGrid } from "@/components/site/NewsGrid";
import { DispersionGlow } from "@/components/site/DispersionGlow";
import { Reveal } from "@/components/ui/Reveal";
import { Band } from "@/components/chrome/Band";
import { bandButtonClassName } from "@/components/chrome/band-button";
import { ReadingColumn } from "@/components/reading/Article";
import { ReaderMock, AgentMock } from "@/components/mockups/ReaderMock";
import { CATALOG } from "@/lib/data/papers";
import { isPdfIngestSupportedHere } from "@/lib/services/ingest";
import { LIVE_TOOLS } from "@/lib/mcp/registry";

/**
 * Landing page, rebuilt per the approved plan's §6.1 (2026-08-23): eleven
 * blocks in Cohere's own section order, adapted where the plan itself calls
 * for an honest replacement rather than a borrowed pattern (§6.1's "two
 * slots get honest replacements": the trust carousel and the testimonial).
 *
 * REVISED 2026-08-23 after a first pass read as generic AI-template output.
 * See design/anti-slop.md for the checklist this and every later phase gets
 * built against. Three changes from the first pass, all driven by that
 * checklist:
 *
 *   1. The shader is now a BOOKEND (hero, closing CTA), not the page's
 *      default surface. Blocks 5 and 8 were dark `<Band>`s with the mesh
 *      gradient behind them; both are now plain surface sections, same as
 *      every other block. "Not every page must have the gradient design" --
 *      a gradient on every other section stops reading as a deliberate
 *      accent and starts reading as the one visual idea the page has.
 *   2. `<Reveal>` (scroll fade-and-lift) no longer wraps every section.
 *      Wrapping all ten meant every element on the page entered the same
 *      way on scroll, which is its own template tell ("fade-up on nearly
 *      every element"). It now sits on exactly two sections, the ones
 *      where a scroll-triggered reveal genuinely earns its keep (the
 *      mechanism demo, because it is the one live product screenshot; the
 *      evidence guarantee, because it is the page's actual argument). Every
 *      other section renders plainly, present on first paint.
 *   3. CapabilityCards (block 4) no longer reads as the generic
 *      three-icon-in-a-ring feature grid: see that component's own comment
 *      for what changed.
 *
 * SCOPE NOTE. `StickyDemoPanel` and `PacingStrip` are listed in the plan as
 * "restyled not rewritten" but are not assigned to any of the eleven named
 * blocks in §6.1 -- Cohere's structure has no slot for either. Rather than
 * invent a twelfth block the plan doesn't ask for, this page omits both;
 * they remain built and available (components/site/StickyDemoPanel.tsx,
 * components/site/PacingStrip.tsx) if a later pass finds them a real home.
 *
 * `DisciplineGrid` (block 6) is an honest adaptation of the plan's own
 * spec, not a literal implementation of it -- see that component's header
 * comment for why forcing exactly seven tiles onto pillar colours would
 * have meant inventing a discipline taxonomy that does not exist in this
 * codebase.
 */

function Section({
  kicker,
  title,
  children,
  className,
}: {
  kicker?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex min-h-[72vh] flex-col justify-center border-t border-border py-s-8 ${className ?? ""}`}
    >
      <ReadingColumn wide>
        {kicker && <p className="kicker">{kicker}</p>}
        {title && (
          <h2 className="mt-s-3 max-w-2xl font-sans text-[1.75rem] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[2.1rem]">
            {title}
          </h2>
        )}
        <div className="mt-s-6">{children}</div>
      </ReadingColumn>
    </section>
  );
}

export default function MarketingPage() {
  const ingestSupported = isPdfIngestSupportedHere();

  return (
    <main className="flex flex-col">
      {/* Block 1: hero. Shader bookend #1. Front-door field and stats now
          live inside Hero itself (plan §2) -- see that component's header
          comment for why the old overlapping frosted card is gone. */}
      <Hero
        papersInCatalog={CATALOG.length}
        mcpToolsLive={LIVE_TOOLS.length}
        // Literal, not derived: fixtures/workspace.json's evidence array has
        // 11 rows, 10 with a real anchor (1 is deliberately unsupported /
        // anchor: null). Same hand-copied-real-value precedent as
        // MechanismDemo.tsx's own fixture numbers.
        claimsAnchored={10}
        ingestSupported={ingestSupported}
      />

      {/* Block 3: source strip. */}
      <SourceStrip />

      {/* Block 4: three value props. Plain section, no scroll reveal --
          this is above the fold on most screens and should just be there. */}
      <Section title="Located. Traceable. Yours.">
        <DispersionGlow tone="amber" className="-left-12 top-0" />
        <CapabilityCards />
      </Section>

      {/* Block 5: reader showcase. Plain section now, not a shader band --
          the mechanism demo screenshot is the thing worth looking at here,
          not a moving background behind it. This is the one section still
          worth a scroll reveal: it is the page's first real product
          screenshot, and a fade-in gives a beat of attention it would not
          get sitting flush with the section above it. */}
      <Reveal>
        <section className="flex min-h-[72vh] flex-col justify-center border-t border-border py-s-8">
          {/* Widened past ReadingColumn's default "wide" (max-w-3xl, 768px):
              at that width the right column only had ~358px to give
              MechanismDemo, whose own internal 3-column beam layout needs
              real room (see that component's own comment for the confirmed
              measurement). max-w-6xl gives the demo column ~600px once its
              xl: split activates. */}
          <ReadingColumn wide className="max-w-6xl">
            <div className="grid gap-s-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
              <div>
                <p className="kicker">The mechanism</p>
                <h2 className="mt-s-3 font-sans text-[1.75rem] font-semibold leading-snug text-ink sm:text-[2.1rem]">
                  Every claim, one click from its text.
                </h2>
                <p className="mt-s-4 font-sans text-[1.0625rem] leading-[1.75] text-ink-muted">
                  Each claim is matched against the exact sentence it cites,
                  and scored. Above 0.92 it is quote located and shows its
                  quote, page and citation id. Between 0.75 and 0.92 it is
                  paraphrase. Below that the anchor is dropped and the
                  citation is stripped rather than left dangling.
                </p>
              </div>
              <MechanismDemo />
            </div>
          </ReadingColumn>
        </section>
      </Reveal>

      {/* Block 6: discipline grid. */}
      <Section kicker="Discover" title="Grounded across the literature.">
        <DispersionGlow tone="green" className="right-0 top-0" />
        <DisciplineGrid papers={CATALOG} />
      </Section>

      {/* Block 7: tabbed capability overview. */}
      <Section kicker="What it can do" title="Tools your agent can call directly.">
        <CapabilityTabs />
      </Section>

      {/* Block 8: developer band. Plain section, matching block 5's
          reasoning -- the code panel is the content, not the background
          behind it. */}
      <Section kicker="For agents" title="Your agent can check its own claims before it answers.">
        <div className="grid gap-s-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <p className="font-sans text-[1.0625rem] leading-[1.75] text-ink-muted">
              Connect over MCP and your agent calls verify_claim on its own
              sentences before asserting them. When one comes back
              unsupported, it says so in the same breath.
            </p>
            <Link
              href="/mcp"
              className="mt-s-4 inline-block font-sans text-sm text-accent-text underline underline-offset-2"
            >
              See the tools
            </Link>
          </div>
          <AgentMock />
        </div>
      </Section>

      {/* Block 9: the evidence guarantee. The page's actual argument, and
          the second (last) place a scroll reveal earns its keep. */}
      <Reveal>
        <Section
          kicker="The guarantee"
          title="We do not say verified. We show you where it says it."
        >
          <div className="grid gap-s-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="font-sans text-[1.0625rem] leading-[1.75] text-ink-muted">
              <p>
                A fuzzy-matched quote proves quotation provenance, not
                entailment. A model can attach a real Methods sentence to a
                wrong conclusion and still score 1.0 on the match.
              </p>
              <p className="mt-s-4">
                So the badge always reads{" "}
                <strong className="text-ink">quote located</strong>, and never{" "}
                <strong className="text-ink">verified</strong>. Saying that
                here, rather than in a footnote, is the point.
              </p>
            </div>
            <ReaderMock />
          </div>
        </Section>
      </Reveal>

      {/* Block 10: news grid. */}
      <Section kicker="Recent" title="What changed.">
        <DispersionGlow tone="violet" className="-left-8 bottom-0" />
        <NewsGrid />
      </Section>

      {/* Block 11: CTA band. Shader bookend #2. SiteFooter renders directly
          beneath this, from app/(marketing)/layout.tsx. */}
      <Band
        as="section"
        className="flex min-h-[62vh] flex-col items-center justify-center border-t border-border px-6 py-s-8 text-center"
      >
        <h2 className="font-sans text-[1.75rem] font-semibold leading-snug text-brand-ink-reversed sm:text-[2.4rem]">
          Ready to check your sources?
        </h2>
        <div className="mt-s-6">
          <Link href="/discover" className={bandButtonClassName("primary")}>
            Browse the library
          </Link>
        </div>
      </Band>
    </main>
  );
}
