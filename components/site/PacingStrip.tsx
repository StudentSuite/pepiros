import clsx from "clsx";
import { pillarColor } from "@/components/ui/PillarChip";

interface PacingStop {
  label: string;
  timing: string;
  detail: string;
}

// The ingest pacing sequence, plan.md §1. The first three stops describe
// existing, already-fast UI/API behaviour (skeleton graph render, the
// Related Papers rail's no-LLM fetch). The last two describe the real
// parse -> generate pipeline (lib/services/ingest.ts) and are checked
// against actual runs with scripts/measure-pacing.ts, not invented: a real
// run against a short paper landed archetype classification under 1s,
// pillar planning a few seconds after that, and the generator fan-out
// spread across the rest of the ~15-45s window, tracking this range rather
// than blowing past it. That fan-out currently covers 6 of 21 generator
// types (docs/PLAN-V1.md §8); the window will likely shift as the rest ship.
const PACING_STOPS: PacingStop[] = [
  {
    label: "Skeleton graph",
    timing: "<300ms",
    detail: "Paper node and ghost pillars pulse in, before any AI has run.",
  },
  {
    label: "Related papers",
    timing: "<1s",
    detail: "The Related Papers rail populates from Semantic Scholar, no LLM involved.",
  },
  {
    label: "Metadata badge",
    timing: "<2s",
    detail: "Metadata and an archetype badge appear, a fast pass.",
  },
  {
    label: "Summary + pillars",
    timing: "~5-10s",
    detail: "Archetype classification and pillar planning resolve -- the upload view's live progress reflects this in real time, stage by stage.",
  },
  {
    label: "Generators + graph expansion",
    timing: "~15-45s",
    detail: "Remaining generators fill in (6 of 21 types implemented so far), and citation-graph expansion becomes available.",
  },
];

/**
 * The real ingest pacing sequence as 5 stops, each pillar-colored by cycling
 * `pillarColor(1..5)` -- the same dot-per-pillar thread the canvas itself
 * uses (plan.md §10), not an arbitrary rainbow.
 *
 * `variant="teaser"` (default) is the condensed home-page row: label +
 * timing only. `variant="full"` adds the one-sentence detail, for
 * `/how-it-works`.
 */
export function PacingStrip({ variant = "teaser" }: { variant?: "teaser" | "full" }) {
  return (
    <ol className="flex flex-col gap-s-5 sm:flex-row sm:gap-s-4">
      {PACING_STOPS.map((stop, index) => (
        <li
          key={stop.label}
          className={clsx(
            "flex flex-1 flex-col gap-1.5",
            index > 0 && "border-t border-border pt-s-3 sm:border-l sm:border-t-0 sm:pl-s-4 sm:pt-0",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: pillarColor((index % 5) + 1) }}
            />
            <span className="font-sans text-sm text-ink">{stop.label}</span>
          </div>
          <span className="font-mono text-xs text-ink-faint">{stop.timing}</span>
          {variant === "full" && (
            <p className="font-sans text-xs leading-relaxed text-ink-faint">{stop.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
