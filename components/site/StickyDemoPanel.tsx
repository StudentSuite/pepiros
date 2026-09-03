"use client";

import { useEffect, useRef, useState } from "react";
import { RefChip } from "@/components/ui/RefChip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { EvidenceTier } from "@/types/anchor";

/**
 * Issue #296: "a sticky demo panel that changes state as the copy scrolls
 * past it (locate a quote, then show the tier, then show a claim that
 * fails)." Three stage markers drive the panel via IntersectionObserver as
 * each scrolls into the viewport's center band; the panel itself stays
 * pinned beside them at lg and up (a plain stack below lg, where there's no
 * room for a sticky column beside scrolling text anyway).
 *
 * Content mirrors the same real ws-1 demo data HeroGroundingMoment used to
 * show (fixtures/workspace.json's C2 "Sleep onset latency drop" evidence
 * row for the two grounded stages) plus a second, real unsupported row from
 * the same fixture for the third stage -- not fabricated content, the exact
 * grounding pipeline output "Try the demo" itself shows.
 */
interface Stage {
  copy: string;
  claim: string;
  refId: string;
  /** null for the unsupported stage -- plan.md §4: below the match floor the
   *  anchor is dropped, so there is no quote to show, not a weak one. */
  quote: string | null;
  tier: EvidenceTier;
  showTier: boolean;
}

const STAGES: Stage[] = [
  {
    copy: "Every claim is matched against the exact sentence it cites, before anything else happens.",
    claim: "Sleep onset latency fell 34% (95% CI 21-45, p=0.003) vs. placebo.",
    refId: "C2",
    quote:
      "Mean sleep onset latency decreased by 34% (95% CI 21-45), p=0.003, in the bright-light arm relative to placebo.",
    tier: "quote_located",
    showTier: false,
  },
  {
    copy: "Above 0.92 it's quote located. The badge never says \"verified\" -- a fuzzy match proves quotation, not entailment.",
    claim: "Sleep onset latency fell 34% (95% CI 21-45, p=0.003) vs. placebo.",
    refId: "C2",
    quote:
      "Mean sleep onset latency decreased by 34% (95% CI 21-45), p=0.003, in the bright-light arm relative to placebo.",
    tier: "quote_located",
    showTier: true,
  },
  {
    copy: "Below the floor, the anchor is dropped and the citation is stripped -- a claim with nothing behind it says so plainly.",
    claim: "Cross-cohort heterogeneity was severe enough that no single p-value should be read as precise.",
    refId: "C7",
    quote: null,
    tier: "unsupported",
    showTier: true,
  },
];

export function StickyDemoPanel() {
  const reducedMotion = usePrefersReducedMotion();
  const [stage, setStage] = useState(0);
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reducedMotion) return; // settle on the last, most-informative stage
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = markerRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index >= 0) setStage(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    markerRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [reducedMotion]);

  const active = STAGES[reducedMotion ? STAGES.length - 1 : stage]!;

  return (
    <div className="grid gap-s-8 lg:grid-cols-2 lg:items-start">
      {/* Issue #365: a pure vh gap ties "how far you scroll per stage" to
          the viewport alone, decoupled from the step copy it's meant to
          isolate for the IntersectionObserver above. Text-size preferences
          scale the copy (rem) but not a vh gap, so larger text can run two
          stages together; a tall monitor at low zoom turns the same vh
          into an unreadable stretch of nothing. clamp() keeps the vh as
          the normal-case value while a rem floor guarantees enough room
          for the copy and a rem ceiling caps the empty-scroll extreme. */}
      <div className="flex flex-col gap-[clamp(20rem,40vh,40rem)] lg:gap-[clamp(24rem,50vh,48rem)]">
        {STAGES.map((s, i) => (
          <div
            key={i}
            ref={(el) => {
              markerRefs.current[i] = el;
            }}
            className="font-serif text-xl leading-snug text-ink"
          >
            {s.copy}
          </div>
        ))}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="paper-grain rounded-xl border border-border bg-paper p-s-5 text-ink shadow-e-3">
          <div className="flex flex-wrap items-start justify-between gap-s-2">
            <p className="font-serif text-lg leading-snug text-ink">{active.claim}</p>
            {/* No ref chip once the anchor is dropped -- plan.md §4: "the
                citation is stripped rather than left dangling," not shown
                pointing at nothing. */}
            {active.quote && <RefChip refId={active.refId} />}
          </div>
          {active.quote ? (
            <div className="mt-s-4 rounded-lg border border-border bg-paper-muted p-s-4">
              <p className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
                Source excerpt
              </p>
              <p className="mt-s-2 rounded-sm bg-located/25 px-0.5 font-serif text-base leading-relaxed text-ink transition-colors duration-slow ease-out">
                {active.quote}
              </p>
              {active.showTier && (
                <div className="mt-s-3">
                  <EvidenceBadge tier={active.tier} className="!text-ink" />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-s-4 rounded-lg border border-dashed border-unsupported/40 bg-unsupported/10 p-s-4">
              <p className="font-sans text-sm leading-relaxed text-ink-muted">
                No source sentence cleared the verifier&rsquo;s floor. The citation is stripped, not
                shown pointing at a weak match.
              </p>
              {active.showTier && (
                <div className="mt-s-3">
                  <EvidenceBadge tier={active.tier} className="!text-ink" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
