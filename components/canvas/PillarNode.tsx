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
        "w-52 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded border-2 bg-surface-raised px-3 py-2 transition-opacity",
        node.stale && "opacity-50",
      )}
      style={{
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 8%, var(--surface-raised))`,
        animationDelay: `${appearDelayMs ?? 0}ms`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div className="flex items-start justify-between gap-2">
        <div
          className="font-mono text-[10px] font-medium uppercase tracking-widest"
          style={{ color: pillarTextColor(node.pillarIndex) }}
        >
          {node.title}
        </div>
        {canToggle && (
          <button
            type="button"
            // nodrag/nopan: without these React Flow treats the pointerdown as a
            // node drag and the click never lands.
            className="nodrag nopan -mr-1 -mt-0.5 flex shrink-0 items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
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
      <p className="mt-1 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
