"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PepirosNode } from "./types";
import { stripRefMarkers } from "./InlineRefs";

/**
 * The root of a paper's subtree -- biggest, most opaque treatment on the canvas
 * (plan.md: "paper = the root/biggest"). `contains` edges fan out from here to its
 * pillars, so this node carries no pillarIndex of its own (GraphNode.pillarIndex is
 * null for `paper` nodes).
 */
export function PaperNode({ data }: NodeProps<PepirosNode>) {
  const { node, appearDelayMs } = data;
  return (
    <div
      className={clsx(
        "w-64 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded border-2 border-border-strong bg-surface-raised px-4 py-3 shadow-lg transition-opacity",
        node.stale && "opacity-50",
      )}
      style={{ animationDelay: `${appearDelayMs ?? 0}ms` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-strong" />
      <div className="font-sans text-[11px] uppercase tracking-wide text-ink-faint">Paper</div>
      <div className="mt-1 font-sans text-base font-semibold leading-snug text-ink">{node.title}</div>
      <p className="mt-1.5 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      {node.stale && (
        <div className="mt-2 font-sans text-[11px] text-ink-faint">stale — source paper removed</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border-strong" />
    </div>
  );
}
