import type { GraphNode, Workspace } from "@/types/anchor";
import {
  containedChildren,
  crossPaperNodes,
  footprintFor,
  packRow,
  packRowWidth,
  paperNodes,
} from "./footprints";

/**
 * Multi-paper layered layout (docs/PLAN-V1.md §9.1): one column per paper,
 * synthesis/thread nodes in a center gutter.
 *
 * Deliberately not a scaled-up radial -- a full ring per paper would collide
 * with its column neighbours. Nested `packRow` at three levels instead, with
 * the same Y for every column's pillar row and leaf row, so the eye can scan
 * "methods across all three papers" horizontally. That row alignment is the
 * whole readability argument for columns over rings at this scale.
 */

const PAPER_GUTTER = 100;
const PILLAR_GUTTER = 40;
const LEAF_GUTTER = 24;
const PILLAR_ROW_GAP = 80;
const LEAF_ROW_GAP = 60;

interface PaperPlan {
  paper: GraphNode;
  pillars: Array<{ pillar: GraphNode; leaves: GraphNode[]; width: number }>;
  columnWidth: number;
}

export function layeredLayout(workspace: Workspace): GraphNode[] {
  const paperFp = footprintFor("paper");
  const pillarFp = footprintFor("pillar");
  const leafFp = footprintFor("leaf");

  const plans: PaperPlan[] = paperNodes(workspace).map((paper) => {
    const pillars = containedChildren(workspace, paper.id, "pillar").map((pillar) => {
      const leaves = containedChildren(workspace, pillar.id, "leaf");
      const leafRowWidth = packRowWidth(
        leaves.map(() => leafFp.w),
        LEAF_GUTTER,
      );
      // A pillar's slot must be at least as wide as its own leaf row, or the
      // leaves of adjacent pillars overlap even though the pillars don't.
      return { pillar, leaves, width: Math.max(pillarFp.w, leafRowWidth) };
    });

    const pillarRowWidth = packRowWidth(
      pillars.map((p) => p.width),
      PILLAR_GUTTER,
    );
    return { paper, pillars, columnWidth: Math.max(paperFp.w, pillarRowWidth) };
  });

  const cross = crossPaperNodes(workspace);
  const crossWidth = packRowWidth(
    cross.map((n) => footprintFor(n.type).w),
    PILLAR_GUTTER,
  );

  // The center gutter is a real slot in the same top-level packRow, not an
  // afterthought positioned by eye -- so it is genuinely between the papers
  // it synthesizes, at any paper count.
  const slotWidths = plans.map((p) => p.columnWidth);
  const gutterIndex = Math.floor(plans.length / 2);
  if (cross.length > 0) slotWidths.splice(gutterIndex, 0, crossWidth);

  const slotCenters = packRow(slotWidths, PAPER_GUTTER);

  const yPaper = 0;
  const yPillar = paperFp.h / 2 + pillarFp.h / 2 + PILLAR_ROW_GAP;
  const yLeaf = yPillar + pillarFp.h / 2 + leafFp.h / 2 + LEAF_ROW_GAP;

  const positioned: GraphNode[] = [];

  plans.forEach((plan, planIndex) => {
    // Skip past the gutter slot once we're to the right of it.
    const slotIndex =
      cross.length > 0 && planIndex >= gutterIndex ? planIndex + 1 : planIndex;
    const columnCenter = slotCenters[slotIndex]!;

    positioned.push({ ...plan.paper, x: Math.round(columnCenter), y: yPaper });

    const pillarCenters = packRow(
      plan.pillars.map((p) => p.width),
      PILLAR_GUTTER,
    );

    plan.pillars.forEach((entry, i) => {
      const pillarCenter = columnCenter + pillarCenters[i]!;
      positioned.push({ ...entry.pillar, x: Math.round(pillarCenter), y: Math.round(yPillar) });

      const leafCenters = packRow(
        entry.leaves.map(() => leafFp.w),
        LEAF_GUTTER,
      );
      entry.leaves.forEach((leaf, j) => {
        positioned.push({
          ...leaf,
          x: Math.round(pillarCenter + leafCenters[j]!),
          y: Math.round(yLeaf),
        });
      });
    });
  });

  if (cross.length > 0) {
    const gutterCenter = slotCenters[gutterIndex]!;
    const crossCenters = packRow(
      cross.map((n) => footprintFor(n.type).w),
      PILLAR_GUTTER,
    );
    cross.forEach((node, i) => {
      // Sat at pillar height, not below the leaves: these are about
      // cross-paper relationships, not leaf-level detail, so burying them
      // under every leaf row would misrepresent where they sit conceptually.
      positioned.push({
        ...node,
        x: Math.round(gutterCenter + crossCenters[i]!),
        y: Math.round(yPillar),
      });
    });
  }

  const placed = new Set(positioned.map((n) => n.id));
  for (const node of workspace.nodes) {
    if (!placed.has(node.id)) positioned.push(node);
  }

  return positioned;
}

/**
 * Bounding box per paper subtree, for the low-alpha hulls §9.1 mentions.
 * Falls out of the layout for free, so it's exported rather than recomputed
 * by whatever eventually draws them.
 */
export function paperHulls(
  workspace: Workspace,
  positioned: GraphNode[],
): Array<{ paperId: string; x0: number; y0: number; x1: number; y1: number }> {
  const byId = new Map(positioned.map((n) => [n.id, n] as const));
  const padding = 40;

  return paperNodes(workspace)
    .map((paper) => {
      const subtree = [paper.id];
      for (const pillar of containedChildren(workspace, paper.id, "pillar")) {
        subtree.push(pillar.id);
        for (const leaf of containedChildren(workspace, pillar.id, "leaf")) subtree.push(leaf.id);
      }

      const nodes = subtree.map((id) => byId.get(id)).filter((n): n is GraphNode => Boolean(n));
      if (nodes.length === 0 || !paper.paperId) return null;

      const xs = nodes.flatMap((n) => {
        const fp = footprintFor(n.type);
        return [n.x - fp.w / 2, n.x + fp.w / 2];
      });
      const ys = nodes.flatMap((n) => {
        const fp = footprintFor(n.type);
        return [n.y - fp.h / 2, n.y + fp.h / 2];
      });

      return {
        paperId: paper.paperId,
        x0: Math.min(...xs) - padding,
        y0: Math.min(...ys) - padding,
        x1: Math.max(...xs) + padding,
        y1: Math.max(...ys) + padding,
      };
    })
    .filter((hull): hull is NonNullable<typeof hull> => hull !== null);
}
