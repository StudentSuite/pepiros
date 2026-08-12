import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import {
  allPillarIds,
  computeVisibleGraph,
  hiddenLeafIds,
  leavesByPillar,
  visibleEdges,
} from "./visibility";

const workspace = workspaceFixture as unknown as Workspace;

describe("leavesByPillar", () => {
  it("maps each pillar to its own leaves via contains", () => {
    const map = leavesByPillar(workspace);
    expect(map.size).toBeGreaterThan(0);

    const nodeById = new Map(workspace.nodes.map((n) => [n.id, n] as const));
    for (const [pillarId, leafIds] of map) {
      expect(nodeById.get(pillarId)!.type).toBe("pillar");
      for (const leafId of leafIds) expect(nodeById.get(leafId)!.type).toBe("leaf");
    }
  });

  it("accounts for every leaf in the fixture", () => {
    const mapped = new Set([...leavesByPillar(workspace).values()].flat());
    const allLeaves = workspace.nodes.filter((n) => n.type === "leaf");
    expect(mapped.size).toBe(allLeaves.length);
  });
});

describe("computeVisibleGraph", () => {
  it("shows everything when nothing is collapsed", () => {
    const { nodeIds, edges } = computeVisibleGraph(workspace, new Set());
    expect(nodeIds.size).toBe(workspace.nodes.length);
    expect(edges).toHaveLength(workspace.edges.length);
  });

  // The headline declutter number: 20 nodes down to 12 on the bundled fixture.
  it("hides every leaf when all pillars are collapsed, leaving structure", () => {
    const { nodeIds } = computeVisibleGraph(workspace, allPillarIds(workspace));
    const leafCount = workspace.nodes.filter((n) => n.type === "leaf").length;

    expect(nodeIds.size).toBe(workspace.nodes.length - leafCount);
    for (const leaf of workspace.nodes.filter((n) => n.type === "leaf")) {
      expect(nodeIds.has(leaf.id)).toBe(false);
    }
    // Papers, pillars, and cross-paper nodes all survive -- collapsing hides
    // detail, never structure.
    for (const node of workspace.nodes.filter((n) => n.type !== "leaf")) {
      expect(nodeIds.has(node.id)).toBe(true);
    }
  });

  it("drops the contains edges of hidden leaves without any edge-specific logic", () => {
    const collapsed = computeVisibleGraph(workspace, allPillarIds(workspace));
    const containsToLeaves = workspace.edges.filter((e) => {
      const target = workspace.nodes.find((n) => n.id === e.targetId);
      return e.kind === "contains" && target?.type === "leaf";
    });

    expect(containsToLeaves.length).toBeGreaterThan(0);
    for (const edge of containsToLeaves) {
      expect(collapsed.edges.some((e) => e.id === edge.id)).toBe(false);
    }
  });

  it("keeps paper -> pillar edges when pillars are collapsed", () => {
    const { edges } = computeVisibleGraph(workspace, allPillarIds(workspace));
    const paperToPillar = workspace.edges.filter((e) => {
      const source = workspace.nodes.find((n) => n.id === e.sourceId);
      const target = workspace.nodes.find((n) => n.id === e.targetId);
      return e.kind === "contains" && source?.type === "paper" && target?.type === "pillar";
    });

    expect(paperToPillar.length).toBeGreaterThan(0);
    for (const edge of paperToPillar) {
      expect(edges.some((e) => e.id === edge.id)).toBe(true);
    }
  });

  it("expanding one pillar reveals exactly that pillar's leaves", () => {
    const all = allPillarIds(workspace);
    const pillarWithLeaves = [...leavesByPillar(workspace).entries()].find(
      ([, leaves]) => leaves.length > 0,
    )!;
    const [pillarId, ownLeaves] = pillarWithLeaves;

    const expanded = new Set(all);
    expanded.delete(pillarId);
    const { nodeIds } = computeVisibleGraph(workspace, expanded);

    for (const leafId of ownLeaves) expect(nodeIds.has(leafId)).toBe(true);

    const otherLeaves = [...leavesByPillar(workspace).entries()]
      .filter(([id]) => id !== pillarId)
      .flatMap(([, leaves]) => leaves);
    for (const leafId of otherLeaves) expect(nodeIds.has(leafId)).toBe(false);
  });

  // The contradiction pair is between two leaves under different pillars, so it
  // only shows once both are expanded -- worth pinning, since a contradiction
  // silently vanishing would undercut the product's whole point.
  it("shows a cross-paper contradiction edge only when both its leaves are expanded", () => {
    const contradiction = workspace.edges.find((e) => e.kind === "contradicts")!;
    const byPillar = leavesByPillar(workspace);
    const pillarsOf = (leafId: string) =>
      [...byPillar.entries()].filter(([, leaves]) => leaves.includes(leafId)).map(([id]) => id);

    const needed = new Set([
      ...pillarsOf(contradiction.sourceId),
      ...pillarsOf(contradiction.targetId),
    ]);
    expect(needed.size).toBeGreaterThan(0);

    const allCollapsed = computeVisibleGraph(workspace, allPillarIds(workspace));
    expect(allCollapsed.edges.some((e) => e.id === contradiction.id)).toBe(false);

    const bothExpanded = new Set(allPillarIds(workspace));
    for (const id of needed) bothExpanded.delete(id);
    const expanded = computeVisibleGraph(workspace, bothExpanded);
    expect(expanded.edges.some((e) => e.id === contradiction.id)).toBe(true);
  });
});

describe("hiddenLeafIds", () => {
  it("returns nothing for an empty collapse set", () => {
    expect(hiddenLeafIds(workspace, new Set()).size).toBe(0);
  });

  it("ignores a collapsed id that isn't a pillar", () => {
    expect(hiddenLeafIds(workspace, new Set(["not-a-pillar"])).size).toBe(0);
  });
});

describe("visibleEdges", () => {
  it("drops an edge when either endpoint is hidden", () => {
    const edge = workspace.edges[0]!;
    const withoutSource = new Set(workspace.nodes.map((n) => n.id));
    withoutSource.delete(edge.sourceId);
    expect(visibleEdges(workspace, withoutSource).some((e) => e.id === edge.id)).toBe(false);

    const withoutTarget = new Set(workspace.nodes.map((n) => n.id));
    withoutTarget.delete(edge.targetId);
    expect(visibleEdges(workspace, withoutTarget).some((e) => e.id === edge.id)).toBe(false);
  });
});
