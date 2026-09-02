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
// than blowing past it. Not every generator type ships yet (see
// lib/agents/generators/index.ts for current coverage); the window will
// likely shift as the rest land.
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
    detail: "Archetype classification and pillar planning resolve, shown live as they happen.",
  },
  {
    label: "Generators + graph expansion",
    timing: "~15-45s",
    detail: "Remaining generators fill in, and citation-graph expansion becomes available.",
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
    // Intrinsic columns, not a viewport breakpoint.
    //
    // This was `flex flex-col sm:flex-row` with `flex-1` per stop, which laid
    // all 5 stops side by side from the `sm` breakpoint up. A breakpoint reads
    // the VIEWPORT, and this strip's problem is its CONTAINER: on
    // /how-it-works the `full` variant sits in a narrow right-hand panel, so a
    // wide screen still gave each stop about 75px. "Generators + graph
    // expansion" then wrapped to one word per line and the whole strip read as
    // five columns of confetti.
    //
    // auto-fit + minmax lets the grid decide how many columns actually fit in
    // whatever width it is handed, so it degrades to 2 columns or 1 in a
    // narrow panel without knowing anything about the viewport. The `full`
    // variant reserves more because it also carries a sentence of detail.
    //
    // Container queries would express this more directly, but Tailwind v3
    // needs a plugin for those and this needs none.
    <ol
      className={clsx(
        "grid gap-x-s-4 gap-y-s-4",
        variant === "full"
          ? "grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]"
          : "grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",
      )}
    >
      {PACING_STOPS.map((stop, index) => (
        <li
          key={stop.label}
          // Rule ABOVE every stop rather than a divider between them. A left
          // border on "not the first" is wrong the moment the grid wraps: the
          // first stop on the second row would draw one against nothing.
          className="flex flex-col gap-1.5 border-t border-border pt-s-3"
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
