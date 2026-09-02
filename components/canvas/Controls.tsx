"use client";

import { Panel as FlowPanel, useReactFlow } from "@xyflow/react";
import { MOTION_MS } from "@/lib/motion";

// h-11 w-11 = 44px, the WCAG 2.5.5/2.5.8 touch-target minimum -- was h-7 w-7
// (28px). Focus ring comes from globals.css's global `button:focus-visible`
// fallback rule, no class needed here.
const buttonClass =
  "flex h-11 w-11 items-center justify-center rounded font-sans text-sm leading-none text-ink-muted hover:bg-surface-sunken hover:text-ink";

// React Flow's fitView takes a raw ms number, not a CSS class, so this can't
// read `duration-canvas` directly. Was a local 590 hand-matched to the token;
// now comes from lib/motion.ts so a token retune reaches it (see that file).
const FIT_VIEW_DURATION_MS = MOTION_MS.canvas;

/**
 * A themed replacement for React Flow's default `<Controls/>` -- same zoomIn/
 * zoomOut/fitView calls, but styled to match `surface-raised`/`border` instead of
 * shipping unstyled light-mode chrome (plan.md §10). No minimap button here --
 * the minimap is cut entirely (plan.md §11).
 */
export function Controls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <FlowPanel position="bottom-right">
      <div className="flex flex-col gap-1 rounded border border-border bg-surface-raised p-1 shadow-lg">
        <button type="button" onClick={() => zoomIn()} aria-label="Zoom in" className={buttonClass}>
          +
        </button>
        <button type="button" onClick={() => zoomOut()} aria-label="Zoom out" className={buttonClass}>
          −
        </button>
        <button
          type="button"
          onClick={() => fitView({ duration: FIT_VIEW_DURATION_MS })}
          aria-label="Fit view"
          className={buttonClass}
        >
          ⤢
        </button>
      </div>
    </FlowPanel>
  );
}
