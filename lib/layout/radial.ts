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
/** ±35° is fixed by the spec (docs/PLAN-V1.md §9.1); the radius flexes instead so the fan never overlaps. */
const FAN_HALF_ANGLE = (35 * Math.PI) / 180;
const START_ANGLE = -Math.PI / 2; // 12 o'clock, so a 1-pillar graph reads upward
/**
 * Issue #284: a fixed ±35° fan is safe on its own only while pillars are
 * spaced further apart than 2×35°=70° -- true for the common case (up to 5
 * pillars, per docs/PLAN-V1.md §9.1's own "leaves fanned at parent angle
 * ±35°"), but once pillarStep itself drops to 70° or below (6 pillars, the
 * schema's real max per plan.md's 7-hue pillar ceiling), neighbouring
 * pillars' fans don't just crowd each other, their angular ranges actually
 * cross. No radius can fix a genuine angular crossing (a chord shrinks
 * toward the two points' *angular* separation regardless of radius, and a
 * crossed pair has none to shrink from) -- the fan itself has to narrow.
 * Reimplementing the exact geometry standalone confirmed 6 pillars x 2
 * leaves each produces 6 overlapping cross-pillar leaf pairs at any radius
 * under the unshrunk fan.
 *
 * Rather than deriving a closed-form safe angle (the joint constraint
 * between cross-pillar clearance and each pillar's own intra-fan chord
 * doesn't reduce to one simple formula once radius and angle both move,
 * and a leaf's angular offset from its *own* pillar also interacts with
 * that pillar's absolute position on the ring in a way a single scalar
 * bound doesn't capture), placeAt() below is tried at the full ±35° fan
 * first, and only narrowed in small steps -- re-checking the *actual*
 * resulting positions for real overlaps each time -- until it's genuinely
 * collision-free. This is cheap: the node count this ever runs against is
 * small and bounded (≤6 pillars × 9 leaves per plan.md's caps).
 */
const FAN_SHRINK_STEP = (1 * Math.PI) / 180;
const MIN_FAN_HALF_ANGLE = (5 * Math.PI) / 180;

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

interface Placed {
  node: GraphNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Axis-aligned overlap between two placed cards -- same definition lib/layout/layout.test.ts checks against. */
function boxesOverlap(a: Placed, b: Placed): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

function hasAnyOverlap(placed: Placed[]): boolean {
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (boxesOverlap(placed[i]!, placed[j]!)) return true;
    }
  }
  return false;
}

/** Pillar ring + leaf fans at a given fan half-angle. Pure function of its inputs, called repeatedly while searching for a collision-free angle. */
function placePillarsAndLeaves(
  pillars: GraphNode[],
  pillarRingRadius: number,
  pillarStep: number,
  fanHalfAngle: number,
  pillarFp: { w: number; h: number },
  leafFp: { w: number; h: number },
  containedLeaves: (pillar: GraphNode) => GraphNode[],
): Placed[] {
  const placed: Placed[] = [];

  pillars.forEach((pillar, i) => {
    const angle = START_ANGLE + i * pillarStep;
    const px = pillarRingRadius * Math.cos(angle);
    const py = pillarRingRadius * Math.sin(angle);
    placed.push({ node: { ...pillar, x: Math.round(px), y: Math.round(py) }, x: px, y: py, w: pillarFp.w, h: pillarFp.h });

    const leaves = containedLeaves(pillar);
    if (leaves.length === 0) return;

    // Radial clearance: far enough out that a leaf card cannot overlap the
    // pillar ring regardless of the arc math below.
    const radialFloor = pillarRingRadius + pillarFp.h / 2 + leafFp.h / 2 + LEAF_CLEARANCE;

    if (leaves.length === 1) {
      const x = radialFloor * Math.cos(angle);
      const y = radialFloor * Math.sin(angle);
      placed.push({ node: { ...leaves[0]!, x: Math.round(x), y: Math.round(y) }, x, y, w: leafFp.w, h: leafFp.h });
      return;
    }

    // Spread across the (possibly narrowed) arc, then push the radius out
    // until neighbouring leaves along that arc stop touching.
    const leafStep = (2 * fanHalfAngle) / (leaves.length - 1);
    const chordNeeded = (leafFp.w + LEAF_GUTTER) / (2 * Math.sin(leafStep / 2));
    const rLeaf = Math.max(radialFloor, chordNeeded);

    leaves.forEach((leaf, j) => {
      const leafAngle = angle - fanHalfAngle + j * leafStep;
      const x = rLeaf * Math.cos(leafAngle);
      const y = rLeaf * Math.sin(leafAngle);
      placed.push({ node: { ...leaf, x: Math.round(x), y: Math.round(y) }, x, y, w: leafFp.w, h: leafFp.h });
    });
  });

  return placed;
}

export function radialLayout(workspace: Workspace, paperNode: GraphNode): GraphNode[] {
  const positioned: GraphNode[] = [];

  positioned.push({ ...paperNode, x: 0, y: 0 });

  const pillars = containedChildren(workspace, paperNode.id, "pillar");
  const pillarFp = footprintFor("pillar");
  const leafFp = footprintFor("leaf");

  const rPillar = ringRadius(pillars.length, pillarFp.w, PILLAR_GUTTER, RING_MIN_RADIUS);
  const pillarStep = pillars.length > 0 ? (2 * Math.PI) / pillars.length : 0;
  const leavesOf = (pillar: GraphNode) => containedChildren(workspace, pillar.id, "leaf");

  // Issue #284: try the full spec'd ±35° fan first (unchanged for every
  // pillar count this doesn't affect), only narrowing -- and re-verifying
  // against the actual candidate positions -- if that turns out unsafe.
  let fanHalfAngle = FAN_HALF_ANGLE;
  let placed = placePillarsAndLeaves(pillars, rPillar, pillarStep, fanHalfAngle, pillarFp, leafFp, leavesOf);
  while (hasAnyOverlap(placed) && fanHalfAngle > MIN_FAN_HALF_ANGLE) {
    fanHalfAngle = Math.max(MIN_FAN_HALF_ANGLE, fanHalfAngle - FAN_SHRINK_STEP);
    placed = placePillarsAndLeaves(pillars, rPillar, pillarStep, fanHalfAngle, pillarFp, leafFp, leavesOf);
  }
  positioned.push(...placed.map((p) => p.node));

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
  const placedIds = new Set(positioned.map((n) => n.id));
  for (const node of workspace.nodes) {
    if (!placedIds.has(node.id)) positioned.push(node);
  }

  return positioned;
}
