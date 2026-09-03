import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { buttonClassName } from "@/components/ui/Button";
import { EDGE_KIND_MEANINGS } from "@/lib/graph/legend";
import type { EdgeKind } from "@/types/anchor";

// Structural "contains" and same-kind "shares_method"/"derived_from" left out:
// this card is about the cross-paper relational signal, not the full 8-kind
// set. Colour still matches GraphEdge.tsx's baseColor() by hand (that
// function isn't itself importable data), but issue #319 found the dash
// values here had drifted from the real DASH table anyway (extends "2 3" vs
// the real "1 3", relates "6 4" vs the real "9 4") despite this file's own
// comment insisting they couldn't -- dash now reads from
// lib/graph/legend.ts's EDGE_KIND_MEANINGS directly, the same source
// GraphEdge.tsx's own DASH table and CanvasLegend.tsx are kept in sync
// against, so a hand-copied number can't go stale here again.
const SHOWN_KINDS: EdgeKind[] = ["agrees", "contradicts", "extends", "relates", "cites"];
const KIND_COLOR: Partial<Record<EdgeKind, string>> = {
  agrees: "var(--located)",
  contradicts: "var(--unsupported)",
};
const LEGEND = SHOWN_KINDS.map((kind) => {
  const meaning = EDGE_KIND_MEANINGS.find((m) => m.kind === kind)!;
  return {
    label: meaning.label,
    color: KIND_COLOR[kind] ?? "var(--ink-muted)",
    dash: meaning.dash ?? undefined,
  };
});

/**
 * Compact right-rail summary of the full canvas -- a real link into
 * /w/[id]/canvas (docs/PLAN-V1.md §1: canvas is reached via the explicit
 * "Explore graph" link), not a second graph engine. The legend documents
 * what the edge lines on that canvas actually mean.
 */
export function GraphPreviewCard({ workspaceId, nodeCount }: { workspaceId: string; nodeCount: number }) {
  return (
    <Panel padded className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-faint">Citation graph</h3>
        <span className="font-mono text-2xs text-ink-faint">{nodeCount} nodes</span>
      </div>

      <ul className="flex flex-col gap-1">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <svg width="20" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="20"
                y2="4"
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dash}
              />
            </svg>
            <span className="font-sans text-xs text-ink-muted">{item.label}</span>
          </li>
        ))}
      </ul>

      <Link href={`/w/${workspaceId}/canvas`} className={buttonClassName("secondary", "sm", "w-full")}>
        Explore full graph
      </Link>
    </Panel>
  );
}
