import type { GraphEdge, Workspace } from "@/types/anchor";

/**
 * Which nodes and edges the canvas shows for a given collapse state.
 *
 * Pure domain logic rather than part of the React component: it's the rule that
 * actually declutters the graph, so it's worth testing directly instead of
 * through a rendered canvas.
 */

/** Leaf ids under each pillar, via `contains` (§4.6 guarantees a strict tree). */
export function leavesByPillar(workspace: Workspace): Map<string, string[]> {
  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n] as const));
  const map = new Map<string, string[]>();
  for (const edge of workspace.edges) {
    if (edge.kind !== "contains") continue;
    const parent = nodeById.get(edge.sourceId);
    const child = nodeById.get(edge.targetId);
    if (parent?.type !== "pillar" || child?.type !== "leaf") continue;
    map.set(parent.id, [...(map.get(parent.id) ?? []), child.id]);
  }
  return map;
}

export function hiddenLeafIds(workspace: Workspace, collapsedPillarIds: Set<string>): Set<string> {
  const byPillar = leavesByPillar(workspace);
  return new Set([...collapsedPillarIds].flatMap((pillarId) => byPillar.get(pillarId) ?? []));
}

/**
 * An edge shows only when both its endpoints do. This single rule is what makes
 * pillar collapse declutter edges for free: 15 of the bundled fixture's 22
 * edges are `contains` scaffolding, so hiding a pillar's leaves removes their
 * tree edges with no edge-specific logic -- and the same rule will hide
 * ghost-citation edges whenever their ghost nodes aren't shown.
 */
export function visibleEdges(workspace: Workspace, visibleNodeIds: Set<string>): GraphEdge[] {
  return workspace.edges.filter(
    (e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId),
  );
}

export interface VisibleGraph {
  nodeIds: Set<string>;
  edges: GraphEdge[];
}

export function computeVisibleGraph(
  workspace: Workspace,
  collapsedPillarIds: Set<string>,
): VisibleGraph {
  const hidden = hiddenLeafIds(workspace, collapsedPillarIds);
  const nodeIds = new Set(workspace.nodes.filter((n) => !hidden.has(n.id)).map((n) => n.id));
  return { nodeIds, edges: visibleEdges(workspace, nodeIds) };
}

/** Every pillar collapsed -- the canvas's default, so a graph opens as structure. */
export function allPillarIds(workspace: Workspace): Set<string> {
  return new Set(workspace.nodes.filter((n) => n.type === "pillar").map((n) => n.id));
}
