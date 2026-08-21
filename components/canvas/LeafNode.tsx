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
      <div data-lod="title" className="font-sans text-[11px] font-medium leading-snug text-ink">{node.title}</div>
      <p data-lod="body" className="mt-1 line-clamp-3 font-serif text-[12px] leading-snug text-ink-muted">
        {stripRefMarkers(node.bodyMd)}
      </p>
      <InlineRefs bodyMd={node.bodyMd} evidence={evidence} className="mt-1.5 flex flex-wrap gap-1" />
      {/* Issue #249: used to stay silent for a well-grounded claim and only
          speak up for a weaker tier, which meant the card face gave no
          grounding signal at all until you opened the drawer -- the 2026-08-16
          critique's "same silhouette as any React Flow demo" gap. Showing
          the tier always, not just as a warning, is what makes an anchored
          claim look different from an unanchored one at a glance. */}
      {weakest && <EvidenceBadge tier={weakest} className="mt-1.5" />}
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}
