"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PepirosNode } from "./types";
import { InlineRefs, stripRefMarkers } from "./InlineRefs";

/**
 * Cross-paper synthesis -- has no pillarIndex and no paperId (it isn't scoped to one
 * paper's tree), so it can't borrow `pillarColor()` the way pillar/leaf nodes do.
 * Distinct via shape, not a new color (design tokens stay closed per plan.md §10):
 * a wide double border reads as "assembled from elsewhere" rather than authored in
 * place. `stale: true` (plan.md §5) means a paper it derived from was removed --
 * dimmed but kept, never deleted, so the reader can see what broke.
 */
export function SynthesisNode({ data }: NodeProps<PepirosNode>) {
  const { node, evidence, spannedPapers, appearDelayMs } = data;
  return (
    <div
      className={clsx(
        "w-72 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded-lg border-4 border-double border-border-strong bg-surface-raised px-4 py-3 transition-opacity",
        node.stale && "opacity-50",
      )}
      style={{ animationDelay: `${appearDelayMs ?? 0}ms` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-strong" />
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Synthesis</div>
        {spannedPapers && spannedPapers.length > 0 && (
          <div className="flex -space-x-1.5">
            {spannedPapers.map((p) => (
              <span
                key={p.id}
                title={p.label}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-surface-raised bg-surface-sunken font-mono text-[9px] text-ink-muted"
              >
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1 font-sans text-sm font-semibold leading-snug text-ink">{node.title}</div>
      <p className="mt-1.5 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <InlineRefs bodyMd={node.bodyMd} evidence={evidence} className="mt-2 flex flex-wrap gap-1" />
      {node.stale && (
        <div className="mt-2 font-sans text-[11px] text-ink-faint">stale — a source paper was removed</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border-strong" />
    </div>
  );
}
