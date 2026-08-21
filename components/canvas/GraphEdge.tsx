"use client";

import { useState } from "react";
import clsx from "clsx";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { pillarColor } from "@/components/ui/PillarChip";
import type { EdgeKind } from "@/types/anchor";
import type { PepirosEdge } from "./types";

/**
 * Edge color/dash mapping by kind (decided here, the one place it's decided):
 *  - contains        solid, neutral border-strong -- the structural tree, always
 *                     neutral so it never competes visually with pillar color.
 *  - cites           solid, ink-muted -- cross-paper citation, distinct from contains.
 *  - shares_method   solid, ink-muted base.
 *  - relates         dashed, ink-muted base.
 *  - derived_from    dashed, ink-muted base.
 *  - extends         dotted, ink-muted base.
 *  - agrees          solid, reuses the semantic `located` (green) token -- agreement
 *                     reads as the same "good" signal as a well-grounded quote.
 *  - contradicts     solid, reuses the semantic `unsupported` (red) token.
 * "Same-pillar edges tint toward pillarColor()" applies only to the five non-semantic
 * relational kinds (cites/shares_method/relates/derived_from/extends): if both
 * endpoints share a non-null pillarIndex, pillarColor() replaces the ink-muted base,
 * dash pattern unchanged. `contains` stays neutral (it spans pillars by definition --
 * a paper node contains every pillar) and `agrees`/`contradicts` keep their fixed
 * semantic color always, so a contradiction can never be mistaken for a pillar tint.
 */
const DASH: Partial<Record<EdgeKind, string>> = {
  // Issue #249: relates/derived_from/shares_method/extends previously
  // collapsed into just two visually distinct patterns (two pairs sharing
  // one dasharray each, cites/shares_method both solid) whenever an edge
  // wasn't pillar-tinted -- five kinds could only be told apart as two.
  // Kept in sync with lib/graph/legend.ts's own dash field, which the
  // legend panel renders from; the two must not drift.
  shares_method: "5 3",
  relates: "9 4",
  derived_from: "1 3 5 3",
  extends: "1 3",
  // "6 6" matches the .motion-dash-march CSS class exactly (app/globals.css) --
  // an inline strokeDasharray would otherwise fight the class's own dasharray.
  contradicts: "6 6",
};

const TINTABLE = new Set<EdgeKind>(["relates", "derived_from", "extends", "shares_method", "cites"]);

function baseColor(kind: EdgeKind): string {
  switch (kind) {
    case "contains":
      return "var(--border-strong)";
    case "agrees":
      return "var(--located)";
    case "contradicts":
      return "var(--unsupported)";
    default:
      return "var(--ink-muted)";
  }
}

function strokeWidth(kind: EdgeKind): number {
  // Issue #249: 1.25 was thin enough that the dash/dot rhythm above barely
  // registered at default zoom, on top of the kinds it collided with.
  return kind === "agrees" || kind === "contradicts" ? 2 : 1.5;
}

/** Edge kinds render as machine-ish slugs; a hover label should read as English. */
const KIND_LABEL: Record<EdgeKind, string> = {
  contains: "contains",
  relates: "relates to",
  derived_from: "derived from",
  agrees: "agrees with",
  contradicts: "contradicts",
  extends: "extends",
  shares_method: "shares method",
  cites: "cites",
};

export function GraphEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  interactionWidth,
}: EdgeProps<PepirosEdge>) {
  // GraphCanvas always attaches `data` when building edges (see the `edges` map in
  // GraphCanvas.tsx) -- there is no code path that renders a GraphEdge without it.
  const { edge, sourcePillarIndex, targetPillarIndex, dashMarchEnabled } = data!;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const revealed = hovered || focused;

  const samePillar = sourcePillarIndex != null && sourcePillarIndex === targetPillarIndex;
  const color = TINTABLE.has(edge.kind) && samePillar ? pillarColor(sourcePillarIndex) : baseColor(edge.kind);
  const marching = edge.kind === "contradicts" && dashMarchEnabled;

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        // .motion-dash-march also carries the prefers-reduced-motion override
        // from Stage A6 -- disabling it there doesn't need a second check here.
        className={clsx(marching && "motion-dash-march")}
        style={{
          stroke: color,
          // Hover thickens (docs/PLAN-V1.md §9.1); keyboard focus does the same
          // (see the interaction path below) so a sighted keyboard user gets
          // the same cue a mouse hover gives. Widening the stroke rather than
          // changing color keeps the kind's own semantic color intact -- a
          // contradiction stays red while hovered/focused.
          strokeWidth: strokeWidth(edge.kind) + (revealed ? 1 : 0),
          strokeDasharray: DASH[edge.kind],
          // Fine dot/dash-dot patterns (extends, derived_from) render as
          // legible dots and dashes with a round cap; the default butt cap
          // shrinks each short dash segment into a barely-visible sliver.
          strokeLinecap: "round",
          transition: "stroke-width var(--dur-fast) var(--ease-out)",
        }}
      />
      {/* A bezier path is ~1px of hit target, which is unhittable in practice.
          This invisible wider path is what actually catches the pointer; React
          Flow passes its own default width in via interactionWidth. Also the
          only way to reach an edge's meaning by keyboard: relationship kind
          used to be hover-only, so a sighted keyboard user (and anyone who
          can't hover) had no way to learn what a line meant. Tab reaches it
          and focus reveals the same label hover does. */}
      <path
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={interactionWidth ?? 20}
        className="react-flow__edge-interaction"
        tabIndex={0}
        role="img"
        aria-label={KIND_LABEL[edge.kind]}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {revealed && (
        <EdgeLabelRenderer>
          <div
            // Borrowed styling rather than the Tooltip/Popover primitives: both
            // anchor to a wrapping trigger element, and an SVG path has no
            // wrapper at its midpoint to anchor to.
            className="pointer-events-none absolute rounded border border-border-strong bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted shadow-e-2"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {KIND_LABEL[edge.kind]}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
