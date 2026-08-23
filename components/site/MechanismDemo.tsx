"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useReducedMotion } from "framer-motion";
import { AnimatedBeam } from "@/components/shadcn/animated-beam";
import { RefChip } from "@/components/ui/RefChip";
import type { EvidenceTier } from "@/types/anchor";

/**
 * The mechanism showpiece: a summary on the left, the papers on the right, and
 * a beam that lands on the exact sentence a claim came from.
 *
 * Replaces the old stacked VerificationDemo. That one put claim above source
 * and drew a beam downward, which read as a page turning rather than as a
 * binding: top-to-bottom is the page's own reading order, so the source
 * excerpt looked like the next paragraph instead of the claim's evidence.
 * Across, the two are peers and the beam is the only thing between them,
 * which is the actual argument the product makes.
 *
 * The beam is Magic UI's AnimatedBeam (components/shadcn/animated-beam.tsx),
 * which solves the part that was hand-rolled and wrong before: it measures
 * both endpoints against the container and re-measures under a ResizeObserver,
 * so the line still lands on the right sentence after a reflow or a font swap.
 * The old fixed SVG path did not, and pointed at empty space once the panel
 * changed width.
 *
 * All three claims stay on screen at once, and the third one fails. Showing
 * the failure beside two successes, rather than as a separate beat you have to
 * wait for, is the honest version of this pitch: a reader can see what an
 * unsupported claim looks like without taking our word that we catch them.
 */

interface Beat {
  claim: string;
  refId: string;
  tier: EvidenceTier;
  matchScore: number;
  /** Where the beam lands, split so the matched sentence can be marked in place. */
  source: {
    cite: string;
    before: string;
    sentence: string;
    after: string;
  } | null;
}

/**
 * Content is illustrative, but it is the fixture's real text (fixtures/
 * workspace.json, chunks c-p1-results-1 and c-p2-results-1) rather than
 * invented prose, so nothing here claims a paper says something it does not.
 * Beat 3 has no source on purpose: that is the point of it.
 */
const BEATS: Beat[] = [
  {
    claim: "Morning bright light cut sleep onset latency by 34% against placebo.",
    refId: "C2",
    tier: "quote_located",
    matchScore: 0.97,
    source: {
      cite: "Okafor et al., 2022 · Results · p.5",
      before: "Across the four-week protocol, ",
      sentence:
        "mean sleep onset latency decreased by 34% (95% CI 21-45), p=0.003, in the bright-light arm relative to placebo.",
      after: " Adherence was 91% by actigraphy.",
    },
  },
  {
    claim: "Circadian misalignment has a moderate effect on working memory.",
    refId: "C5",
    tier: "paraphrase",
    matchScore: 0.81,
    source: {
      cite: "Chen et al., 2021 · Results · p.6",
      before: "Pooling across the eighteen included studies, ",
      sentence:
        "circadian misalignment was associated with a pooled effect size of d=0.41 (95% CI 0.29-0.53) on working memory.",
      after: " Heterogeneity was moderate.",
    },
  },
  {
    claim: "So bright light removes the need for melatonin entirely.",
    refId: "C2",
    tier: "unsupported",
    matchScore: 0.34,
    source: null,
  },
];

const TIER_LABEL: Record<EvidenceTier, string> = {
  quote_located: "quote located",
  paraphrase: "paraphrase",
  unsupported: "unsupported",
};

/** Brand colour per tier, as a CSS var the SVG stroke can take directly. */
const TIER_VAR: Record<EvidenceTier, string> = {
  quote_located: "var(--located)",
  paraphrase: "var(--paraphrase)",
  unsupported: "var(--unsupported)",
};

const TIER_TEXT: Record<EvidenceTier, string> = {
  quote_located: "text-located",
  paraphrase: "text-paraphrase",
  unsupported: "text-unsupported",
};

const TIER_MARK: Record<EvidenceTier, string> = {
  quote_located: "bg-located/15 decoration-located",
  paraphrase: "bg-paraphrase/15 decoration-paraphrase",
  unsupported: "bg-unsupported/15 decoration-unsupported",
};

const HOLD_MS = 4200;

/**
 * Counts to `value` over `ms`, or lands on it immediately when the reader has
 * asked for reduced motion. rAF rather than a CSS transition because the
 * number itself has to change, not just its position.
 */
function useCountUp(value: number, ms: number, enabled: boolean) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!enabled) {
      setShown(value);
      return;
    }
    let raf = 0;
    const from = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // easeOutCubic: fast then settling, so the last digits are readable.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, enabled]);

  return shown;
}

export function MechanismDemo() {
  const reduced = useReducedMotion() ?? false;
  const animate = !reduced;

  const [active, setActive] = useState(0);
  /** Set once the reader picks a claim: the demo stops driving itself and
   *  hands over, rather than yanking the view away mid-read. */
  const [pinned, setPinned] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  // One port per claim row, created up front: hooks cannot be called in a map,
  // and BEATS is a module constant so the count is fixed.
  const port0 = useRef<HTMLSpanElement>(null);
  const port1 = useRef<HTMLSpanElement>(null);
  const port2 = useRef<HTMLSpanElement>(null);
  const ports = [port0, port1, port2];

  const beat = BEATS[active]!;
  const score = useCountUp(beat.matchScore, 900, animate);

  useEffect(() => {
    if (pinned) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % BEATS.length), HOLD_MS);
    return () => clearTimeout(id);
  }, [active, pinned]);

  const pick = useCallback((i: number) => {
    setActive(i);
    setPinned(true);
  }, []);

  return (
    <div className="paper-grain relative overflow-hidden rounded-xl border border-border bg-paper p-s-5 text-ink shadow-e-3 sm:p-s-6">
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Grounding, live
        </p>
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "font-mono text-[10px] uppercase tracking-widest",
              TIER_TEXT[beat.tier],
            )}
          >
            {TIER_LABEL[beat.tier]}
          </span>
          <span
            className="font-mono text-sm tabular-nums text-ink"
            aria-label={`match score ${beat.matchScore.toFixed(2)}`}
          >
            {score.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Below xl the two panels stack and the beam is hidden rather than
          redrawn vertically. Gated on xl, not lg: this card sits in the
          right column of page.tsx's own lg: 2-column grid (copy | demo), so
          at exactly the lg breakpoint both grids would flip to multi-column
          at once and this card's own 3-column split would get squeezed to
          ~100px text columns inside that already-narrow half -- confirmed
          live (word-per-line wrapping) before this was xl. At that width
          the claim and the source are already adjacent, so a line between
          them adds nothing and a near-vertical beam over a narrow column
          reads as a glitch anyway. */}
      {/* containerRef sits here, not on the card: AnimatedBeam computes its
          endpoints relative to the container but renders its SVG at the
          nearest positioned ancestor, so those have to be the same element or
          the line draws offset by this card's padding and header height. */}
      <div
        ref={containerRef}
        className="relative mt-s-5 grid gap-s-4 xl:grid-cols-[minmax(0,1fr)_72px_minmax(0,1.1fr)] xl:gap-0"
      >
        {/* ---------------------------------------------------------- */}
        {/* The summary. Every claim visible, one under inspection.     */}
        {/* ---------------------------------------------------------- */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            The summary
          </p>
          <ul className="flex flex-col gap-1.5">
            {BEATS.map((b, i) => {
              const on = i === active;
              return (
                <li key={b.claim}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={on}
                    className={clsx(
                      "flex w-full items-start gap-2 rounded-md border border-l-2 px-2.5 py-2 text-left",
                      "transition-colors duration-base ease-out",
                      "focus-visible:outline-none focus-visible:shadow-glow-accent",
                      on
                        ? "border-border-strong bg-surface-raised"
                        : "border-transparent hover:border-border",
                    )}
                    // The left rule is the tier's own colour on the active row,
                    // so the claim, the beam and the mark are one object rather
                    // than three things that happen to change at the same time.
                    style={on ? { borderLeftColor: TIER_VAR[b.tier] } : undefined}
                  >
                    <span
                      className={clsx(
                        "font-serif text-[15px] leading-snug transition-colors duration-base ease-out",
                        on ? "text-ink" : "text-ink-faint",
                      )}
                    >
                      {b.claim}
                    </span>
                    {/* The port the beam leaves from. Kept in the flow at the
                        row's end so it tracks the row through any reflow. */}
                    <span
                      ref={ports[i]}
                      aria-hidden
                      className={clsx(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors duration-base ease-out",
                        on ? "" : "bg-border",
                      )}
                      style={on ? { background: TIER_VAR[b.tier] } : undefined}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-s-3 font-sans text-xs text-ink-faint">
            {pinned ? "Pick another claim." : "Click a claim to hold it."}
          </p>
        </div>

        {/* The gutter the beam crosses. Empty on purpose. */}
        <div aria-hidden className="hidden xl:block" />

        {/* ---------------------------------------------------------- */}
        {/* The paper. Either the sentence, or the absence of one.      */}
        {/* ---------------------------------------------------------- */}
        <div className="rounded-lg border border-border bg-paper-muted p-s-4 sm:p-s-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              {beat.source ? "The paper" : "No such sentence"}
            </p>
            <RefChip refId={beat.refId} />
          </div>

          {beat.source ? (
            <>
              <p className="font-serif text-[15px] leading-relaxed text-ink-muted">
                {beat.source.before}
                {/* Port sits at the head of the matched sentence, so the beam
                    lands on the sentence itself rather than on the card. */}
                <span
                  ref={targetRef}
                  aria-hidden
                  className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ background: TIER_VAR[beat.tier] }}
                />
                <mark
                  className={clsx(
                    "rounded-sm px-0.5 text-ink underline decoration-2 underline-offset-4",
                    "transition-colors duration-slow ease-out",
                    TIER_MARK[beat.tier],
                  )}
                >
                  {beat.source.sentence}
                </mark>
                {beat.source.after}
              </p>
              <p className="mt-s-3 font-mono text-[11px] text-ink-faint">{beat.source.cite}</p>
            </>
          ) : (
            <>
              <p className="font-serif text-[15px] leading-relaxed text-ink-muted">
                <span
                  ref={targetRef}
                  aria-hidden
                  className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ background: TIER_VAR[beat.tier] }}
                />
                Nothing in this paper supports the claim. The nearest sentence scored{" "}
                {beat.matchScore.toFixed(2)}, below the floor, so the anchor is dropped and the
                citation is stripped rather than left dangling.
              </p>
              <p className="mt-s-3 font-mono text-[11px] text-unsupported">
                Citation removed, not guessed
              </p>
            </>
          )}
        </div>

        {/* Rendered only from xl up, and keyed on the beat so it redraws from
            scratch rather than easing between two unrelated endpoints. */}
        <div className="pointer-events-none absolute inset-0 hidden xl:block">
          <AnimatedBeam
            key={active}
            containerRef={containerRef}
            fromRef={ports[active]!}
            toRef={targetRef}
            curvature={beat.tier === "unsupported" ? -18 : 18}
            pathColor="var(--border-strong)"
            pathWidth={2.5}
            pathOpacity={0.55}
            gradientStartColor={TIER_VAR[beat.tier]}
            gradientStopColor={TIER_VAR[beat.tier]}
            duration={animate ? 3 : 0.001}
            repeat={animate ? Infinity : 0}
          />
        </div>
      </div>
    </div>
  );
}
