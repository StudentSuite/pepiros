import type { GraphNode, Workspace } from "@/types/anchor";
import { containedChildren, crossPaperNodes, footprintFor } from "./footprints";

/**
 * Single-paper radial layout (docs/PLAN-V1.md §9.1): paper centered, pillars
 * on a ring, leaves fanned at the parent's angle ±35°. Pure function of
 * (pillar count, leaf count per pillar) -- same graph in, same coordinates
 * out, every time.
 */

const RING_MIN_RADIUS = 220;
const PILLAR_GUTTER = 56;
const LEAF_GUTTER = 32;
const LEAF_CLEARANCE = 40;
/** ±35° is fixed by the spec; the radius flexes instead so the fan never overlaps. */
const FAN_HALF_ANGLE = (35 * Math.PI) / 180;
const START_ANGLE = -Math.PI / 2; // 12 o'clock, so a 1-pillar graph reads upward

/**
 * Radius at which N equally-spaced boxes of width `w` stop touching.
 * The chord between neighbours on a circle is 2·R·sin(Δθ/2), so requiring
 * that chord to exceed the box width gives R ≥ w / (2·sin(Δθ/2)). This is what
 * keeps the ring from cramming as pillar count grows toward the 7-hue ceiling,
 * while the floor keeps it from collapsing onto the paper node at N=1-2.
 */
function ringRadius(count: number, boxWidth: number, gutter: number, minRadius: number): number {
  if (count <= 1) return minRadius;
  const step = (2 * Math.PI) / count;
  const needed = (boxWidth + gutter) / (2 * Math.sin(step / 2));
  return Math.max(minRadius, needed);
}

export function radialLayout(workspace: Workspace, paperNode: GraphNode): GraphNode[] {
  const positioned: GraphNode[] = [];

  positioned.push({ ...paperNode, x: 0, y: 0 });

  const pillars = containedChildren(workspace, paperNode.id, "pillar");
  const pillarFp = footprintFor("pillar");
  const leafFp = footprintFor("leaf");

  const rPillar = ringRadius(pillars.length, pillarFp.w, PILLAR_GUTTER, RING_MIN_RADIUS);
  const pillarStep = pillars.length > 0 ? (2 * Math.PI) / pillars.length : 0;

  pillars.forEach((pillar, i) => {
    const angle = START_ANGLE + i * pillarStep;
    positioned.push({
      ...pillar,
      x: Math.round(rPillar * Math.cos(angle)),
      y: Math.round(rPillar * Math.sin(angle)),
    });

    const leaves = containedChildren(workspace, pillar.id, "leaf");
    if (leaves.length === 0) return;

    // Radial clearance: far enough out that a leaf card cannot overlap the
    // pillar ring regardless of the arc math below.
    const radialFloor = rPillar + pillarFp.h / 2 + leafFp.h / 2 + LEAF_CLEARANCE;

    if (leaves.length === 1) {
      positioned.push({
        ...leaves[0]!,
        x: Math.round(radialFloor * Math.cos(angle)),
        y: Math.round(radialFloor * Math.sin(angle)),
      });
      return;
    }

    // Spread across the fixed ±35° arc, then push the radius out until
    // neighbouring leaves along that arc stop touching.
    const leafStep = (2 * FAN_HALF_ANGLE) / (leaves.length - 1);
    const chordNeeded = (leafFp.w + LEAF_GUTTER) / (2 * Math.sin(leafStep / 2));
    const rLeaf = Math.max(radialFloor, chordNeeded);

    leaves.forEach((leaf, j) => {
      const leafAngle = angle - FAN_HALF_ANGLE + j * leafStep;
      positioned.push({
        ...leaf,
        x: Math.round(rLeaf * Math.cos(leafAngle)),
        y: Math.round(rLeaf * Math.sin(leafAngle)),
      });
    });
  });

  // A single-paper workspace can still hold thread nodes (a reading path over
  // one paper). Park them below the whole ring rather than inside it, where
  // they would collide with the leaf fan.
  const cross = crossPaperNodes(workspace);
  if (cross.length > 0) {
    const belowRing = rPillar + pillarFp.h + leafFp.h + LEAF_CLEARANCE * 3;
    const widths = cross.map((n) => footprintFor(n.type).w);
    const total = widths.reduce((s, w) => s + w, 0) + LEAF_GUTTER * (widths.length - 1);
    let cursor = -total / 2;
    cross.forEach((node, i) => {
      const w = widths[i]!;
      positioned.push({ ...node, x: Math.round(cursor + w / 2), y: Math.round(belowRing) });
      cursor += w + LEAF_GUTTER;
    });
  }

  // Any node the contains-tree never reached (orphan, or a type this layout
  // doesn't place) keeps its existing coordinates rather than silently
  // collapsing to 0,0 on top of the paper node.
  const placed = new Set(positioned.map((n) => n.id));
  for (const node of workspace.nodes) {
    if (!placed.has(node.id)) positioned.push(node);
  }

  return positioned;
}
