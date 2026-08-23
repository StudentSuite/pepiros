"use client";

import { useEffect, useRef, useState } from "react";

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

  // How far this element's container sits from the left edge of the scrollable
  // area. The track bleeds out by this much on each side.
  //
  // MEASURED, NOT `100vw`. The previous implementation used `w-screen` with
  // `margin-left: calc(50% - 50vw)`, and 100vw is the viewport INCLUDING the
  // vertical scrollbar while the element is laid out in the space EXCLUDING
  // it. On any page long enough to scroll, which is every page carrying this,
  // the track came out one scrollbar-width too wide and put a horizontal
  // scrollbar on the whole document.
  //
  // clientWidth on the documentElement is the scrollbar-free width, so
  // measuring against it cannot overshoot. Observed rather than read once,
  // because the gutter changes with every viewport resize and a value captured
  // at mount goes wrong the moment the window is dragged.
  const hostRef = useRef<HTMLDivElement>(null);
  const [gutter, setGutter] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const parent = host?.parentElement;
    if (!parent) return;

    const measure = () => {
      const left = parent.getBoundingClientRect().left;
      const available = document.documentElement.clientWidth;
      const right = available - parent.getBoundingClientRect().right;
      // Symmetric bleed, and never past the narrower side, so an off-centre
      // container cannot push the track past the edge on one side.
      setGutter(Math.max(0, Math.min(left, right)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      style={{ width: `calc(100% + ${gutter * 2}px)`, marginLeft: `-${gutter}px` }}
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
