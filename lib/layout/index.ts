import type { GraphNode, Workspace } from "@/types/anchor";
import { layeredLayout } from "./layered";
import { radialLayout } from "./radial";
import { paperNodes } from "./footprints";

export { packRow, packRowWidth, footprintFor, FOOTPRINTS } from "./footprints";
export { radialLayout } from "./radial";
export { layeredLayout, paperHulls } from "./layered";

/**
 * Picks a layout and returns nodes with computed x/y (docs/PLAN-V1.md §9.1).
 *
 * Called from `app/api/graph/[workspaceId]/route.ts`, which is what makes
 * positions genuinely server-computed rather than trusted off the wire.
 * Before this existed, coordinates came from hand-authored values in
 * `fixtures/workspace.json` and a fourth paper had nowhere to go.
 */
export function computeLayout(workspace: Workspace): GraphNode[] {
  const papers = paperNodes(workspace);
  // A ring reads better for one paper; columns are what let the eye compare
  // the same pillar across several. One paper with a ring is not the same
  // picture as one column of a layered layout, so this is a real branch, not
  // an optimization.
  if (papers.length === 1) return radialLayout(workspace, papers[0]!);
  if (papers.length === 0) return workspace.nodes;
  return layeredLayout(workspace);
}
