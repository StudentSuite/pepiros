import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { buttonClassName } from "@/components/ui/Button";

// Matches components/canvas/GraphEdge.tsx's actual baseColor()/DASH exactly --
// a legend that drifts from the real rendering is worse than no legend.
// Structural "contains" and same-kind "shares_method"/"derived_from" left out:
// this card is about the cross-paper relational signal, not the full 8-kind set.
const LEGEND: { label: string; color: string; dash?: string }[] = [
  { label: "agrees", color: "var(--located)" },
  { label: "contradicts", color: "var(--unsupported)", dash: "6 6" },
  { label: "extends", color: "var(--ink-muted)", dash: "2 3" },
  { label: "relates", color: "var(--ink-muted)", dash: "6 4" },
  { label: "cites", color: "var(--ink-muted)" },
];

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
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Citation graph</h3>
        <span className="font-mono text-[10px] text-ink-faint">{nodeCount} nodes</span>
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
