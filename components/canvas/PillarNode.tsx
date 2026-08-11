"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { pillarColor } from "@/components/ui/PillarChip";
import type { PepirosNode } from "./types";
import { stripRefMarkers } from "./InlineRefs";

/**
 * A paper's section header (Methods / Key Finding / Limitations / ...). Mid-size,
 * colored via the shared `pillarColor()` so its border reads as the same structural
 * thread as same-pillar edges and chips elsewhere (plan.md §10).
 */
export function PillarNode({ data }: NodeProps<PepirosNode>) {
  const { node, appearDelayMs } = data;
  const color = pillarColor(node.pillarIndex);
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
      <div className="font-sans text-[11px] font-medium uppercase tracking-wide" style={{ color }}>
        {node.title}
      </div>
      <p className="mt-1 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
