"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PepirosNode } from "./types";
import { InlineRefs, stripRefMarkers } from "./InlineRefs";

/**
 * A reading path: a cross-paper thread the reader (or an asked question) stitched
 * together, not a section of any one paper -- dashed border marks it as connective
 * tissue rather than structural content, distinct from the solid `contains` tree.
 */
export function ThreadNode({ data }: NodeProps<PepirosNode>) {
  const { node, evidence, spannedPapers } = data;
  return (
    <div
      className={clsx(
        "w-64 rounded border-2 border-dashed border-ink-faint bg-surface-raised px-3 py-2.5 transition-opacity",
        node.stale && "opacity-50",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-ink-faint" />
      <div className="flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-wide text-ink-faint">
        <span aria-hidden="true">↝</span> reading path
        {spannedPapers && spannedPapers.length > 0 && (
          <span className="ml-auto font-mono text-[9px] normal-case tracking-normal text-ink-faint">
            {spannedPapers.map((p) => p.label).join(" · ")}
          </span>
        )}
      </div>
      <div className="mt-1 font-sans text-sm font-medium leading-snug text-ink">{node.title}</div>
      <p className="mt-1 font-serif text-[13px] leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <InlineRefs bodyMd={node.bodyMd} evidence={evidence} className="mt-1.5 flex flex-wrap gap-1" />
      <Handle type="source" position={Position.Bottom} className="!bg-ink-faint" />
    </div>
  );
}
