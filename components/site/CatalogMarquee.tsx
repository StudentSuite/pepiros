"use client";

import type { CatalogPaper } from "@/lib/data/papers";

/**
 * Issue #296: "a quiet marquee of indexed papers, paused on hover and under
 * prefers-reduced-motion." Scrolls the real catalog (lib/data/papers.ts),
 * not invented titles. Labelled "in the library" rather than "indexed" --
 * none of the 24 have actually been run through ingest yet (issue #279).
 *
 * Pure CSS animation (no JS timer), so the global prefers-reduced-motion
 * override in app/globals.css already collapses it to a single, static
 * pass rather than needing its own reduced-motion branch here.
 */
export function CatalogMarquee({ papers }: { papers: CatalogPaper[] }) {
  // Doubled so the track can loop seamlessly: the CSS animation slides
  // exactly one copy's width, then snaps back to a visually identical start.
  const doubled = [...papers, ...papers];

  return (
    <div
      className="group relative w-screen overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      style={{ marginLeft: "calc(50% - 50vw)" }}
      aria-hidden="true"
    >
      <div className="flex w-max animate-[marquee_50s_linear_infinite] gap-s-8 py-s-2 group-hover:[animation-play-state:paused]">
        {doubled.map((paper, i) => (
          <span
            key={`${paper.id}-${i}`}
            className="whitespace-nowrap font-mono text-xs text-ink-faint"
          >
            {paper.title}
            <span className="text-ink-faint/50"> &middot; {paper.year}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
