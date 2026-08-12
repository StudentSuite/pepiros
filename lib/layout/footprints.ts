import type { GraphNode, NodeType, Workspace } from "@/types/anchor";

/**
 * Shared geometry for the deterministic layouts (docs/PLAN-V1.md §9.1).
 *
 * Footprints are a hardcoded table, deliberately not measured from the DOM.
 * plan.md §2 requires layout be deterministic and server-computable, and a
 * server has no DOM to measure -- measuring would also make positions depend
 * on font loading and content length, so the same graph would land differently
 * between renders. Widths mirror the Tailwind classes on each node component
 * (w-64/w-52/w-48/w-72/w-64); heights are deliberate over-estimates, since
 * node bodies grow with content and overlap is worse than whitespace.
 */
export interface Footprint {
  w: number;
  h: number;
}

export const FOOTPRINTS: Record<NodeType, Footprint> = {
  paper: { w: 256, h: 130 },
  pillar: { w: 208, h: 90 },
  leaf: { w: 192, h: 150 },
  thread: { w: 256, h: 130 },
  synthesis: { w: 288, h: 150 },
};

export function footprintFor(type: NodeType): Footprint {
  return FOOTPRINTS[type];
}

/**
 * Center-x for each item in a row, with the whole row centered on 0.
 * The one primitive both layouts need: pack N fixed-width boxes without
 * overlap, in a stable order.
 */
export function packRow(widths: number[], gutter: number): number[] {
  if (widths.length === 0) return [];
  const total = widths.reduce((sum, w) => sum + w, 0) + gutter * (widths.length - 1);
  let cursor = -total / 2;
  return widths.map((w) => {
    const center = cursor + w / 2;
    cursor += w + gutter;
    return center;
  });
}

/** Total width a `packRow` call would occupy, without computing positions. */
export function packRowWidth(widths: number[], gutter: number): number {
  if (widths.length === 0) return 0;
  return widths.reduce((sum, w) => sum + w, 0) + gutter * (widths.length - 1);
}

/**
 * Children of `parentId` via `contains`, which §4.6 guarantees forms a strict
 * tree (paper -> pillar -> leaf). Sorted by an explicit key rather than
 * incoming array order: array order happens to be stable in the fixture today,
 * but relying on it would make layout depend on how the workspace was
 * serialized.
 */
export function containedChildren(
  workspace: Workspace,
  parentId: string,
  type: NodeType,
): GraphNode[] {
  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n] as const));
  return workspace.edges
    .filter((e) => e.kind === "contains" && e.sourceId === parentId)
    .map((e) => nodeById.get(e.targetId))
    .filter((n): n is GraphNode => Boolean(n) && n!.type === type)
    .sort((a, b) => {
      // Pillars carry an explicit order; leaves have none, so id is the only
      // stable key available.
      if (a.pillarIndex !== null && b.pillarIndex !== null && a.pillarIndex !== b.pillarIndex) {
        return a.pillarIndex - b.pillarIndex;
      }
      return a.id.localeCompare(b.id);
    });
}

/** Cross-paper nodes hang off derived_from/relates, so no `contains` walk finds them. */
export function crossPaperNodes(workspace: Workspace): GraphNode[] {
  return workspace.nodes
    .filter((n) => n.type === "synthesis" || n.type === "thread")
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function paperNodes(workspace: Workspace): GraphNode[] {
  return workspace.nodes
    .filter((n) => n.type === "paper")
    .sort((a, b) => (a.paperId ?? a.id).localeCompare(b.paperId ?? b.id));
}
