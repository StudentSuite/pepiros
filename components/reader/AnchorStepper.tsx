"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { Highlight } from "./HighlightLayer";

/**
 * Issue #242: "Anchors, 2 of 7" with arrows -- steps through the evidence
 * anchors located on the page currently open in the source pane. Scoped to
 * the current page rather than the whole paper: PdfPane still renders one
 * chunk's page at a time (a continuous, never-re-typeset multi-page source
 * pane is a substantially larger change, tracked separately), so "next"
 * beyond this page's anchors would have nothing to step to yet.
 */
export function AnchorStepper({
  highlights,
  activeNodeId,
  onSelect,
}: {
  highlights: Highlight[];
  activeNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  if (highlights.length === 0) return null;

  const index = Math.max(
    0,
    highlights.findIndex((h) => h.nodeId === activeNodeId),
  );

  function step(delta: number) {
    const next = highlights[(index + delta + highlights.length) % highlights.length];
    if (next) onSelect(next.nodeId);
  }

  return (
    <div className="flex items-center gap-2 font-mono text-2xs text-ink-faint">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous anchor on this page"
        className="rounded p-1 transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
      >
        <Icon icon={ChevronLeft} size="xs" />
      </button>
      <span>
        Anchors, {index + 1} of {highlights.length}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next anchor on this page"
        className="rounded p-1 transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
      >
        <Icon icon={ChevronRight} size="xs" />
      </button>
    </div>
  );
}
