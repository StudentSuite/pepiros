"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { RefChip } from "@/components/ui/RefChip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { LogoMark } from "@/components/ui/Logo";
import type { EvidenceTier } from "@/types/anchor";

interface DemoBeat {
  claim: string;
  refId: string;
  quote: string;
  tier: Extract<EvidenceTier, "quote_located" | "unsupported">;
}

// Hardcoded 2-beat demo content -- illustrative UI, not data (task brief).
// Beat 1 is the happy path (quote located); beat 2 is the honest half: the
// same source, a claim that oversteps it, and the nearest sentence the
// matcher actually found, which does not back the claim up.
const BEATS: DemoBeat[] = [
  {
    claim: "Morning bright light advances circadian phase by about 1.4 hours in shift workers.",
    refId: "C7",
    quote:
      "Participants receiving 30 minutes of 10,000 lux morning light advanced dim-light melatonin onset by 1.4 hours (95% CI 0.9–1.9) after five days.",
    tier: "quote_located",
  },
  {
    claim: "This effect eliminates the need for melatonin supplementation entirely.",
    refId: "C7",
    quote: "The intervention was well tolerated, with no adverse events reported over the five-day protocol.",
    tier: "unsupported",
  },
];

// Local ms mirror of app/globals.css's --dur-slow -- lib/motion.ts only
// exports class-name strings (no numeric values), and this state machine
// needs real setTimeout delays to drive the phase sequence below. The
// transitions themselves still run on the duration-slow/duration-base
// Tailwind classes, so the global prefers-reduced-motion override (which
// forces transition-duration to --dur-fast) still shortens the visible
// motion; only this JS scheduling stays fixed.
const DUR_SLOW = 450;
const HOLD_MS = 2200;
const RESET_PAUSE_MS = 200;

/** 0 idle, 1 claim in, 2 chip in, 3 beam drawn, 4 settled + holding, 5 exiting. */
type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const UNDERLINE_CLASS: Record<DemoBeat["tier"], string> = {
  quote_located: "decoration-located/70",
  unsupported: "decoration-unsupported/70",
};

function delayForPhase(phase: Phase): number {
  if (phase === 0) return RESET_PAUSE_MS;
  if (phase === 4) return HOLD_MS;
  return DUR_SLOW;
}

/**
 * The hero showpiece: claim -> ref chip -> a beam drawing down to the exact
 * quoted sentence -> a "quote located" (or honestly, "unsupported") label.
 * Loops between one happy-path beat and one honest-failure beat so the
 * two-tier framing (plan.md §4) is on screen as much as the win. Self
 * contained, no props -- see BEATS above for the hardcoded content.
 */
export function VerificationDemo() {
  const [beatIndex, setBeatIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(0);
  const beat = BEATS[beatIndex]!;

  useEffect(() => {
    const id = setTimeout(() => {
      if (phase === 5) {
        setBeatIndex((i) => (i + 1) % BEATS.length);
        setPhase(0);
      } else {
        setPhase((p) => (p + 1) as Phase);
      }
    }, delayForPhase(phase));

    return () => clearTimeout(id);
  }, [phase]);

  const exiting = phase === 5;
  const claimIn = phase >= 1 && !exiting;
  const chipIn = phase >= 2 && !exiting;
  const beamDrawn = phase >= 3 && !exiting;
  const settled = phase >= 4 && !exiting;

  return (
    <div
      className="surface-reading paper-grain relative overflow-hidden rounded-xl p-s-6 shadow-e-3 sm:p-s-8"
      aria-hidden="true"
    >
      {/* Brand watermark -- the same LogoMark used in the header, oversized
          and near-invisible, purely for presence. Real generated brand asset
          (design/brand/PEPIROS-BRAND/glyph/monochrome/, regenerated
          2026-08-13), not decoration invented for this component. Fixed
          fill color, not currentColor, so opacity does the "near-invisible"
          work instead of a text-color alpha. */}
      <LogoMark className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-auto opacity-[0.04]" />

      <p className="relative font-mono text-[10px] uppercase tracking-widest text-[#1c1a15]/40">
        Grounding, live
      </p>

      <div className="relative mt-4 flex flex-wrap items-start justify-between gap-4">
        <p
          className={clsx(
            "font-serif text-xl leading-snug text-[#1c1a15] transition-all duration-slow ease-out sm:text-2xl",
            claimIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          {beat.claim}
        </p>
        <span
          className={clsx(
            "shrink-0 transition-all duration-base ease-out",
            chipIn ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          <RefChip refId={beat.refId} />
        </span>
      </div>

      {/* Beam: a wide curved SVG path whose stroke-dashoffset animates from
          the full path length to 0, the same dash-based drawing technique as
          the canvas's dash-march edges (app/globals.css), applied as a
          one-shot CSS transition rather than an added looping @keyframes.
          Curved and full-width now that the panel is wide, not the original
          4px straight drop -- reads as a beam connecting claim to source,
          not a divider line. */}
      <div className="relative -my-2 h-12 w-full" aria-hidden="true">
        <svg viewBox="0 0 400 48" width="100%" height={48} preserveAspectRatio="none">
          <path
            d="M370 4 C 260 4, 220 44, 30 44"
            fill="none"
            stroke="var(--ink-faint)"
            strokeWidth={2}
            strokeDasharray={480}
            strokeDashoffset={beamDrawn ? 0 : 480}
            className="transition-[stroke-dashoffset] duration-slow ease-out"
          />
        </svg>
      </div>

      <div
        className={clsx(
          "relative rounded-lg border border-black/10 bg-paper-muted p-s-5 transition-all duration-slow ease-out sm:p-s-6",
          beamDrawn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#1c1a15]/50">
          Source excerpt
        </p>
        <p
          className={clsx(
            "mt-2 font-serif text-base leading-relaxed text-[#1c1a15] transition-colors duration-base ease-out sm:text-lg",
            settled && ["underline underline-offset-4 decoration-2", UNDERLINE_CLASS[beat.tier]],
          )}
        >
          {beat.quote}
        </p>
        <div
          className={clsx(
            "mt-3 transition-all duration-base ease-out",
            settled ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {/* EvidenceBadge's label hardcodes text-ink-muted, calibrated for the
              dark chrome surfaces (components/ui/EvidenceBadge.tsx) -- on this
              paper-surface panel that's ~2.27:1 against --paper, well under
              WCAG AA. Override at this call site only, with the same literal
              dark-ink hex the codebase already uses for paper-surface text
              (PdfPane.tsx, FlashcardDeck.tsx) -- no Tailwind token exists for
              it, and the shared component stays untouched. `!` forces the
              override regardless of generated-CSS class order, since both
              classes are the same specificity otherwise. */}
          <EvidenceBadge tier={beat.tier} className="!text-[#1c1a15]" />
        </div>
      </div>
    </div>
  );
}
