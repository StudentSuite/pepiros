"use client";

import { Panel as FlowPanel, useReactFlow } from "@xyflow/react";

const buttonClass =
  "flex h-7 w-7 items-center justify-center rounded font-sans text-sm leading-none text-ink-muted hover:bg-surface-sunken hover:text-ink";

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
          onClick={() => fitView({ duration: 200 })}
          aria-label="Fit view"
          className={buttonClass}
        >
          ⤢
        </button>
      </div>
    </FlowPanel>
  );
}
