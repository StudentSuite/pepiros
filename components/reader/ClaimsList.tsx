"use client";

import { useState } from "react";
import clsx from "clsx";
import { buildClaimSummaries, sortClaims, type ClaimSortOrder } from "@/lib/reader/claims";
import { stripRefMarkers } from "@/components/canvas/InlineRefs";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { pillarColor } from "@/components/ui/PillarChip";
import type { Chunk, Evidence, GraphNode } from "@/types/anchor";

const SORT_OPTIONS: { value: ClaimSortOrder; label: string }[] = [
  { value: "weakest", label: "Weakest first" },
  { value: "page", label: "Page order" },
  { value: "pillar", label: "By pillar" },
];

/**
 * The reader's claim stack (issue #244): every claim's grounding tier, match
 * score, ref id and page shown at rest, not just after opening the node --
 * the same gap the 2026-08-16 canvas critique named (nothing on a card says
 * it's anchored until you click it). Deliberately excludes votes, authors,
 * timestamps (issue #244): evidence tiers are deterministic and must not
 * read as a social signal.
 */
export function ClaimsList({
  leafNodes,
  evidence,
  chunks,
  selectedNodeId,
  onSelectNode,
}: {
  leafNodes: GraphNode[];
  evidence: Evidence[];
  chunks: Chunk[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const [order, setOrder] = useState<ClaimSortOrder>("weakest");
  const summaries = sortClaims(buildClaimSummaries(leafNodes, evidence, chunks), order);

  if (summaries.length === 0) {
    return <p className="font-sans text-sm text-ink-faint">No claims for this paper yet.</p>;
  }

  return (
    <div className="flex flex-col gap-s-3">
      <div
        role="radiogroup"
        aria-label="Sort claims"
        className="flex gap-1 rounded-full border border-border bg-surface-sunken p-0.5"
      >
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={order === opt.value}
            onClick={() => setOrder(opt.value)}
            className={clsx(
              "flex-1 rounded-full px-2 py-1 font-sans text-[11px] transition-colors duration-fast ease-out",
              order === opt.value
                ? "bg-surface-raised text-ink shadow-e-1"
                : "text-ink-faint hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-s-2">
        {summaries.map(({ node, weakestEvidence, weakestTier, page }) => (
          <li key={node.id}>
            <button
              type="button"
              id={`claim-${node.id}`}
              onClick={() => onSelectNode(node.id)}
              className={clsx(
                "w-full rounded border px-s-3 py-s-2 text-left transition-colors duration-fast ease-out",
                node.id === selectedNodeId
                  ? "border-border-strong bg-surface-sunken"
                  : "border-border bg-surface-raised hover:border-border-strong",
                node.stale && "opacity-50",
              )}
            >
              <div className="flex items-center gap-1.5">
                {node.pillarIndex != null && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: pillarColor(node.pillarIndex) }}
                    aria-hidden
                  />
                )}
                <span className="font-sans text-[13px] font-medium leading-snug text-ink">
                  {node.title}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 font-serif text-[13px] leading-snug text-ink-muted">
                {stripRefMarkers(node.bodyMd)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px]">
                {weakestTier ? (
                  <>
                    <EvidenceBadge tier={weakestTier} />
                    {weakestEvidence && <RefChip refId={weakestEvidence.refId} />}
                    {page != null && <span className="text-ink-faint">p.{page}</span>}
                    {weakestEvidence && (
                      <span className="text-ink-faint">
                        match {Math.round(weakestEvidence.matchScore * 100)}%
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-ink-faint">No citation resolved for this claim.</span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
