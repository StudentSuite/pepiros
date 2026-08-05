"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
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
  relates: "6 4",
  derived_from: "6 4",
  extends: "2 3",
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
  return kind === "agrees" || kind === "contradicts" ? 2 : 1.25;
}

export function GraphEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<PepirosEdge>) {
  // GraphCanvas always attaches `data` when building edges (see the `edges` map in
  // GraphCanvas.tsx) -- there is no code path that renders a GraphEdge without it.
  const { edge, sourcePillarIndex, targetPillarIndex } = data!;
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const samePillar = sourcePillarIndex != null && sourcePillarIndex === targetPillarIndex;
  const color = TINTABLE.has(edge.kind) && samePillar ? pillarColor(sourcePillarIndex) : baseColor(edge.kind);

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: strokeWidth(edge.kind),
        strokeDasharray: DASH[edge.kind],
      }}
    />
  );
}
