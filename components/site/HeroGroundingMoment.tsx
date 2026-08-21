"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { RefChip } from "@/components/ui/RefChip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Issue #246: the hero used to be a full-bleed generated illustration that
 * carried no information about what the product does. This is the product
 * doing its one trick instead -- a real claim, a real ref, a real located
 * quote, and a match score, in one ~1.2s sequence on load.
 *
 * The claim/quote/ref/score below are fixtures/workspace.json's own C2
 * evidence row (the "Sleep onset latency drop" node in the ws-1 demo
 * workspace) -- the exact same grounding pipeline output a visitor sees a
 * moment later if they click "Try the demo", not marketing copy invented for
 * this page. There is no real *published* paper's text available anywhere in
 * this repo to use instead: the catalog's 24 real papers (lib/data/papers.ts)
 * have never been run through ingest (issue #279 -- needs a local Python
 * interpreter and the production DATABASE_URL, unreachable here), so ws-1's
 * fixture is the only claim/quote pair in this codebase actually backed by
 * the deterministic verifier rather than freshly written for this component.
 */
const CLAIM = "Sleep onset latency fell 34% (95% CI 21-45, p=0.003) vs. placebo.";
const QUOTE =
  "Mean sleep onset latency decreased by 34% (95% CI 21-45), p=0.003, in the bright-light arm relative to placebo.";
const REF_ID = "C2";
const MATCH_SCORE = 100;

/** 0 idle, 1 claim set, 2 ref chip in, 3 highlight sweeps + quote in, 4 score counts up (settled). */
type Phase = 0 | 1 | 2 | 3 | 4;
const PHASE_DELAY_MS = [0, 250, 200, 300, 350] as const;

export function HeroGroundingMoment() {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(0);
  const [score, setScore] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // "Render the end state directly" (issue #246) rather than skip
      // straight through a sequence that would otherwise still play, just
      // shortened, under app/globals.css's global reduced-motion override.
      setPhase(4);
      setScore(MATCH_SCORE);
      return;
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let p = 1; p <= 4; p++) {
      elapsed += PHASE_DELAY_MS[p]!;
      timeouts.push(setTimeout(() => setPhase(p as Phase), elapsed));
    }
    return () => timeouts.forEach(clearTimeout);
  }, [reducedMotion]);

  useEffect(() => {
    if (phase !== 4 || reducedMotion) return;
    const start = performance.now();
    const durationMs = 320;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setScore(Math.round(t * MATCH_SCORE));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, reducedMotion]);

  const claimIn = phase >= 1;
  const chipIn = phase >= 2;
  const sweepIn = phase >= 3;
  const settled = phase >= 4;

  return (
    <div
      className="paper-grain relative mx-auto w-full max-w-lg rounded-xl border border-border bg-paper p-s-5 text-ink shadow-e-3 sm:p-s-6"
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-start justify-between gap-s-2">
        <p
          className={clsx(
            "font-serif text-lg leading-snug text-ink transition-all duration-slow ease-out",
            claimIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          {CLAIM}
        </p>
        <span
          className={clsx(
            "shrink-0 transition-all duration-base ease-out",
            chipIn ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          <RefChip refId={REF_ID} />
        </span>
      </div>

      <div className="mt-s-4 rounded-lg border border-border bg-paper-muted p-s-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Source excerpt
        </p>
        {/* The highlight sweep: same bg-located token HighlightLayer uses for
            a quote_located anchor over a PDF page, applied here as a
            background-colour fade over flowed prose instead of an
            absolutely-positioned rect -- HighlightLayer's own coordinate
            system (PDF point-space rects) doesn't apply to plain text. */}
        <p className="mt-s-2 font-serif text-[15px] leading-relaxed text-ink">
          <span
            className={clsx(
              "rounded-sm px-0.5 transition-colors duration-slow ease-out",
              sweepIn ? "bg-located/25" : "bg-transparent",
            )}
          >
            {QUOTE}
          </span>
        </p>
        <div
          className={clsx(
            "mt-s-3 flex items-center gap-s-3 transition-all duration-base ease-out",
            settled ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          <EvidenceBadge tier="quote_located" className="!text-ink" />
          <span className="font-mono text-[11px] text-ink-faint">match {score}%</span>
        </div>
      </div>
    </div>
  );
}
