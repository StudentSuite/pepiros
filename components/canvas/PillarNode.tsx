"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight } from "lucide-react";
import { pillarColor, pillarTextColor } from "@/components/ui/PillarChip";
import type { PepirosNode } from "./types";
import { stripRefMarkers } from "./InlineRefs";

/**
 * A paper's section header (Methods / Key Finding / Limitations / ...). Mid-size,
 * colored via the shared `pillarColor()` so its border reads as the same structural
 * thread as same-pillar edges and chips elsewhere (plan.md §10).
 *
 * Collapsible, per docs/PLAN-V1.md §9.1's state table for this node type
 * (collapsed / expanded, child-count pill, rotating chevron). Collapsed is the
 * default: a workspace opens showing structure rather than every leaf's body
 * competing for attention, and expanding is the explicit drill-down.
 */
export function PillarNode({ data }: NodeProps<PepirosNode>) {
  const { node, appearDelayMs, leafCount = 0, collapsed = false, onToggleCollapse } = data;
  const color = pillarColor(node.pillarIndex);
  const canToggle = Boolean(onToggleCollapse) && leafCount > 0;

  return (
    <div
      className={clsx(
        "w-52 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded border-2 bg-surface-raised px-3 py-2",
        // Issue #307: faint dispersion glow on hover, the one deliberate
        // exception to "shader stays a bookend" (design/anti-slop.md).
        "transition-[opacity,filter] duration-fast ease-out hover:[filter:var(--glow-dispersion)]",
        node.stale && "opacity-50",
      )}
      style={{
        borderColor: color,
        // 8% -> 4%: pillarTextColor()'s --pillar-N-text tokens are calibrated
        // for 4.5:1 against plain --surface-raised (app/globals.css); the tint
        // this card adds on top of that shifted the worst hue (stone) down to
        // 3.61:1 in practice. Halving it recovers most of that margin back
        // without losing the pillar-tinted-card effect entirely.
        backgroundColor: `color-mix(in srgb, ${color} 4%, var(--surface-raised))`,
        animationDelay: `${appearDelayMs ?? 0}ms`,
      }}
      // Issue #322: explicit fallback so a screen reader always gets at
      // least the title, matching what a sighted user sees at every zoom
      // level rather than depending on hidden content's a11y-tree removal.
      aria-label={node.title}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div className="flex items-start justify-between gap-2">
        <div
          data-lod="title"
          className="font-mono text-2xs font-medium uppercase tracking-widest"
          style={{ color: pillarTextColor(node.pillarIndex) }}
        >
          {node.title}
        </div>
        {canToggle && (
          <button
            type="button"
            // nodrag/nopan: without these React Flow treats the pointerdown as a
            // node drag and the click never lands. Visible box stays small to
            // fit this cramped card header; before: expands the invisible hit
            // area out to the WCAG 44px touch-target minimum instead.
            className="nodrag nopan relative -mr-1 -mt-0.5 flex shrink-0 items-center gap-1 rounded px-1 py-0.5 font-mono text-2xs text-ink-muted transition-colors before:absolute before:-inset-[13px] before:content-[''] hover:bg-surface-sunken hover:text-ink"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse!();
            }}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Show" : "Hide"} ${leafCount} ${leafCount === 1 ? "claim" : "claims"} under ${node.title}`}
          >
            {leafCount}
            <ChevronRight
              size={12}
              strokeWidth={1.5}
              aria-hidden
              className="transition-transform duration-fast ease-out"
              style={{ transform: collapsed ? undefined : "rotate(90deg)" }}
            />
          </button>
        )}
      </div>
      <p data-lod="body" className="mt-1 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
