"use client";

import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PepirosNode } from "./types";
import { InlineRefs, stripRefMarkers } from "./InlineRefs";
import { useWorkspaceStore } from "@/lib/store/workspace";

/**
 * A reading path: a cross-paper thread the reader (or an asked question) stitched
 * together, not a section of any one paper -- dashed border marks it as connective
 * tissue rather than structural content, distinct from the solid `contains` tree.
 */
export function ThreadNode({ data }: NodeProps<PepirosNode>) {
  const { node, evidence, spannedPapers, appearDelayMs } = data;
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  return (
    <div
      className={clsx(
        "w-64 animate-[node-appear_var(--dur-base)_var(--ease-out)_backwards] rounded border-2 border-dashed border-ink-faint bg-surface-raised px-3 py-2.5",
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
      <Handle type="target" position={Position.Top} className="!bg-ink-faint" />
      <div className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest text-ink-faint">
        <span aria-hidden="true">↝</span> reading path
        {/* Issue #387: gap-1 -> gap-4. The extra 12px is what makes the
            before:-inset-x-3 hit zones below not overlap: two 12px insets
            need 24px of real separation to meet edge-to-edge, and this
            gap plus the dot glyph and its own gap-1 clears that with
            margin. */}
        {spannedPapers && spannedPapers.length > 0 && (
          <span className="ml-auto flex items-center gap-4 font-mono text-2xs normal-case tracking-normal text-ink-faint">
            {spannedPapers.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">·</span>}
                {/* A real jump to that paper's node -- this list used to be
                    plain joined text, not interactive at all. */}
                <button
                  type="button"
                  // Issue #387: horizontal inset grown -2 -> -inset-x-3 (12px
                  // each side), taking a ~14px text label to a ~38px-wide hit
                  // area -- short of the 44px floor CanvasLegend.tsx hits,
                  // but this header is a single line shared with the
                  // "reading path" label to its left inside a w-64 card, and
                  // there is no more real width to give multiple paper
                  // references without wrapping the row or truncating the
                  // list, neither of which this pass makes unilaterally.
                  // Vertical stays modest (-inset-y-1, 4px) for the same
                  // bleed-into-adjacent-content reason as SynthesisNode's
                  // avatar buttons just above this file's sibling.
                  className="nodrag nopan relative rounded transition-colors before:absolute before:-inset-x-3 before:-inset-y-1 before:content-[''] hover:text-ink focus-visible:z-10 focus-visible:outline-none focus-visible:shadow-glow-accent"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectNode(p.id);
                  }}
                >
                  {p.label}
                </button>
              </span>
            ))}
          </span>
        )}
      </div>
      <div data-lod="title" className="mt-1 font-sans text-sm font-medium leading-snug text-ink">{node.title}</div>
      <p data-lod="body" className="mt-1 font-serif text-sm leading-snug text-ink-muted">{stripRefMarkers(node.bodyMd)}</p>
      <InlineRefs bodyMd={node.bodyMd} evidence={evidence} className="mt-1.5 flex flex-wrap gap-1" />
      <Handle type="source" position={Position.Bottom} className="!bg-ink-faint" />
    </div>
  );
}
