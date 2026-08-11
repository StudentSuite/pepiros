"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { pillarColor } from "@/components/ui/PillarChip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import type { EvidenceTier } from "@/types/anchor";
import type { PepirosNode } from "./types";
import { InlineRefs, resolveInlineRefs, stripRefMarkers } from "./InlineRefs";

// Weakest-first: a leaf citing several evidence rows surfaces its shakiest grounding,
// not its strongest -- this is the one place on the canvas that should read
// pessimistically (plan.md §4's whole point is not to over-trust a "quote located" badge).
const TIER_RANK: Record<EvidenceTier, number> = { unsupported: 0, paraphrase: 1, quote_located: 2 };

/** The smallest, most detailed card -- one claim, its snippet, and the evidence that
 * grounds it (plan.md: "leaf = smallest/detail card"). */
export function LeafNode({ data }: NodeProps<PepirosNode>) {
  const { node, evidence, appearDelayMs } = data;
  const color = pillarColor(node.pillarIndex);
  const refs = resolveInlineRefs(node.bodyMd, evidence);
  const weakest = refs.reduce<EvidenceTier | null>(
    (acc, ev) => (acc === null || TIER_RANK[ev.tier] < TIER_RANK[acc] ? ev.tier : acc),
    null,
  );

  return (
    <div
      className={clsx(
        "w-48 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded border bg-surface-raised px-2.5 py-2 text-xs transition-opacity",
        node.stale && "opacity-50",
      )}
      style={{ borderColor: color, animationDelay: `${appearDelayMs ?? 0}ms` }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div className="font-sans text-[11px] font-medium leading-snug text-ink">{node.title}</div>
      <p className="mt-1 line-clamp-3 font-serif text-[12px] leading-snug text-ink-muted">
        {stripRefMarkers(node.bodyMd)}
      </p>
      <InlineRefs bodyMd={node.bodyMd} evidence={evidence} className="mt-1.5 flex flex-wrap gap-1" />
      {weakest && weakest !== "quote_located" && <EvidenceBadge tier={weakest} className="mt-1.5" />}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
