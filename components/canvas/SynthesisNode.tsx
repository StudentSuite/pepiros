"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PepirosNode } from "./types";
import { InlineRefs, stripRefMarkers } from "./InlineRefs";
import { useWorkspaceStore } from "@/lib/store/workspace";

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
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  return (
    <div
      className={clsx(
        "w-72 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded-lg border-4 border-double border-border-strong bg-surface-raised px-4 py-3",
        // Issue #307: faint dispersion glow on hover, the one deliberate
        // exception to "shader stays a bookend" (design/anti-slop.md).
        "transition-[opacity,filter] duration-fast ease-out hover:[filter:var(--glow-dispersion)]",
        node.stale && "opacity-50",
      )}
      style={{ animationDelay: `${appearDelayMs ?? 0}ms` }}
      // Issue #322: explicit fallback so a screen reader always gets at
      // least the title, matching what a sighted user sees at every zoom
      // level rather than depending on hidden content's a11y-tree removal.
      aria-label={node.title}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-strong" />
      <div className="flex items-center justify-between">
        <div className="font-mono text-2xs uppercase tracking-widest text-ink-muted">Synthesis</div>
        {/* Issue #387: was -space-x-1.5 (avatars overlapping by 6px), which
            made adjacent before:-inset-2 hit zones overlap heavily -- a
            click near the seam could resolve to the wrong paper, since
            overlapping ::before pseudo-elements hit-test by DOM order, not
            proximity. gap-3 (12px) replaces the overlap so two 12px insets
            meet edge-to-edge with zero overlap: 12+12=24=gap. */}
        {spannedPapers && spannedPapers.length > 0 && (
          <div className="flex gap-3">
            {spannedPapers.map((p) => (
              // A real jump to that paper's node, not just a decorative
              // avatar -- these used to render as inert <span>s that looked
              // clickable (rounded chip, hover-shaped) and did nothing.
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={`Open ${p.label}`}
                // Issue #353: was text-2xs, below the readable floor. p.label
                // is always a 2-char paper id ("P1", "P2", ...), so 10px still
                // fits this h-5 w-5 (20px) circle comfortably.
                //
                // Issue #387: horizontal inset grown from -inset-2 to
                // -inset-x-3, taking the 20px circle to a full 44px-wide hit
                // area with zero overlap against the gap-3 above. Vertical
                // stays at -inset-y-1.5 (not the same -3): this row sits only
                // mt-1 (4px) above the node title text below, and a full
                // 12px vertical extension would reach into it -- since the
                // button's onClick stops propagation, a click meant for the
                // title could silently open the wrong paper instead. 32px
                // vertical is the honest ceiling this layout allows without
                // that regression.
                className="nodrag nopan relative flex h-5 w-5 items-center justify-center rounded-full border border-surface-raised bg-surface-sunken font-mono text-2xs text-ink-muted transition-colors before:absolute before:-inset-x-3 before:-inset-y-1.5 before:content-[''] hover:bg-accent-wash hover:text-accent-text focus-visible:z-10 focus-visible:outline-none focus-visible:shadow-glow-accent"
                onClick={(event) => {
                  event.stopPropagation();
                  selectNode(p.id);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div data-lod="title" className="mt-1 font-sans text-sm font-semibold leading-snug text-ink">{node.title}</div>
      <p data-lod="body" className="mt-1.5 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <InlineRefs bodyMd={node.bodyMd} evidence={evidence} className="mt-2 flex flex-wrap gap-1" />
      {node.stale && (
        <div className="mt-2 font-sans text-2xs text-ink-faint">stale: a source paper was removed</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border-strong" />
    </div>
  );
}
