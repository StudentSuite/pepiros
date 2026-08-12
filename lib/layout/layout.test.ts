import { describe, expect, it } from "vitest";
import type { GraphNode, Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { computeLayout, footprintFor, packRow, packRowWidth, paperHulls } from ".";
import { layeredLayout } from "./layered";
import { radialLayout } from "./radial";

const fixture = workspaceFixture as unknown as Workspace;

/** Axis-aligned overlap between two node cards, using their footprints. */
function overlaps(a: GraphNode, b: GraphNode): boolean {
  const fa = footprintFor(a.type);
  const fb = footprintFor(b.type);
  return (
    Math.abs(a.x - b.x) * 2 < fa.w + fb.w && Math.abs(a.y - b.y) * 2 < fa.h + fb.h
  );
}

function overlappingPairs(nodes: GraphNode[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (overlaps(nodes[i]!, nodes[j]!)) pairs.push([nodes[i]!.id, nodes[j]!.id]);
    }
  }
  return pairs;
}

/** Trims the fixture to a subset of papers, keeping only their subtrees. */
function withPapers(paperIds: string[]): Workspace {
  const keptPaperNodeIds = new Set(
    fixture.nodes.filter((n) => n.paperId && paperIds.includes(n.paperId)).map((n) => n.id),
  );
  const crossIds = new Set(
    fixture.nodes.filter((n) => n.type === "synthesis" || n.type === "thread").map((n) => n.id),
  );
  return {
    ...fixture,
    papers: fixture.papers.filter((p) => paperIds.includes(p.id)),
    nodes: fixture.nodes.filter((n) => keptPaperNodeIds.has(n.id) || crossIds.has(n.id)),
    edges: fixture.edges.filter(
      (e) =>
        (keptPaperNodeIds.has(e.sourceId) || crossIds.has(e.sourceId)) &&
        (keptPaperNodeIds.has(e.targetId) || crossIds.has(e.targetId)),
    ),
  };
}

describe("packRow", () => {
  it("centers a row on zero", () => {
    const centers = packRow([100, 100], 20);
    expect(centers).toEqual([-60, 60]);
  });

  it("leaves the requested gutter between neighbours", () => {
    const centers = packRow([100, 200], 40);
    const gap = centers[1]! - 200 / 2 - (centers[0]! + 100 / 2);
    expect(gap).toBe(40);
  });

  it("handles a single item and an empty row", () => {
    expect(packRow([120], 40)).toEqual([0]);
    expect(packRow([], 40)).toEqual([]);
    expect(packRowWidth([], 40)).toBe(0);
  });
});

describe("radialLayout", () => {
  const single = withPapers(["p1"]);
  const positioned = radialLayout(single, single.nodes.find((n) => n.type === "paper")!);

  it("centers the paper at the origin", () => {
    const paper = positioned.find((n) => n.type === "paper")!;
    expect({ x: paper.x, y: paper.y }).toEqual({ x: 0, y: 0 });
  });

  it("places every node in the workspace", () => {
    expect(positioned).toHaveLength(single.nodes.length);
    expect(new Set(positioned.map((n) => n.id)).size).toBe(single.nodes.length);
  });

  it("produces no overlapping cards", () => {
    expect(overlappingPairs(positioned)).toEqual([]);
  });

  it("puts pillars on a common ring around the paper", () => {
    const radii = positioned
      .filter((n) => n.type === "pillar")
      .map((n) => Math.round(Math.hypot(n.x, n.y)));
    expect(radii.length).toBeGreaterThan(1);
    expect(new Set(radii).size).toBe(1); // all equidistant
  });

  it("pushes leaves outside the pillar ring", () => {
    const pillarRadius = Math.hypot(
      positioned.find((n) => n.type === "pillar")!.x,
      positioned.find((n) => n.type === "pillar")!.y,
    );
    for (const leaf of positioned.filter((n) => n.type === "leaf")) {
      expect(Math.hypot(leaf.x, leaf.y)).toBeGreaterThan(pillarRadius);
    }
  });

  it("is deterministic", () => {
    const again = radialLayout(single, single.nodes.find((n) => n.type === "paper")!);
    expect(again.map((n) => [n.id, n.x, n.y])).toEqual(positioned.map((n) => [n.id, n.x, n.y]));
  });
});

describe("layeredLayout", () => {
  const positioned = layeredLayout(fixture);

  it("places every node exactly once", () => {
    expect(positioned).toHaveLength(fixture.nodes.length);
    expect(new Set(positioned.map((n) => n.id)).size).toBe(fixture.nodes.length);
  });

  it("produces no overlapping cards", () => {
    expect(overlappingPairs(positioned)).toEqual([]);
  });

  it("aligns each row to a shared Y across every paper column", () => {
    const yByType = (type: GraphNode["type"]) =>
      new Set(positioned.filter((n) => n.type === type).map((n) => n.y));
    // One Y per row is the whole readability argument for columns: it lets you
    // scan "methods across all three papers" horizontally.
    expect(yByType("paper").size).toBe(1);
    expect(yByType("pillar").size).toBe(1);
    expect(yByType("leaf").size).toBe(1);
  });

  it("orders rows paper -> pillar -> leaf top to bottom", () => {
    const y = (type: GraphNode["type"]) => positioned.find((n) => n.type === type)!.y;
    expect(y("paper")).toBeLessThan(y("pillar"));
    expect(y("pillar")).toBeLessThan(y("leaf"));
  });

  it("puts cross-paper nodes between the paper columns, not off to one side", () => {
    const paperXs = positioned.filter((n) => n.type === "paper").map((n) => n.x);
    const synth = positioned.find((n) => n.type === "synthesis")!;
    expect(synth.x).toBeGreaterThan(Math.min(...paperXs));
    expect(synth.x).toBeLessThan(Math.max(...paperXs));
  });

  it("keeps each paper's leaves under that paper's own column", () => {
    const byId = new Map(positioned.map((n) => [n.id, n] as const));
    for (const paper of positioned.filter((n) => n.type === "paper")) {
      const ownLeaves = positioned.filter((n) => n.type === "leaf" && n.paperId === paper.paperId);
      for (const leaf of ownLeaves) {
        // Within half a column of its paper, not clustered under a neighbour.
        expect(Math.abs(leaf.x - byId.get(paper.id)!.x)).toBeLessThan(400);
      }
    }
  });

  it("is deterministic", () => {
    expect(layeredLayout(fixture).map((n) => [n.id, n.x, n.y])).toEqual(
      positioned.map((n) => [n.id, n.x, n.y]),
    );
  });
});

describe("computeLayout", () => {
  it("uses the radial layout for one paper and columns for several", () => {
    const one = computeLayout(withPapers(["p1"]));
    const pillarYs = new Set(one.filter((n) => n.type === "pillar").map((n) => n.y));
    expect(pillarYs.size).toBeGreaterThan(1); // a ring spans several Y values

    const many = computeLayout(fixture);
    expect(new Set(many.filter((n) => n.type === "pillar").map((n) => n.y)).size).toBe(1);
  });

  // The actual test that layout generalizes: hand-authored coordinates could
  // never survive the paper set changing.
  it("lays out sanely for every paper-count from 1 to 3, with no overlaps", () => {
    for (const ids of [["p1"], ["p1", "p2"], ["p1", "p2", "p3"]]) {
      const positioned = computeLayout(withPapers(ids));
      expect(overlappingPairs(positioned), `overlap at ${ids.length} paper(s)`).toEqual([]);
      expect(positioned.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    }
  });

  it("returns nodes untouched when there are no paper nodes to anchor a layout", () => {
    const empty: Workspace = { ...fixture, papers: [], nodes: [], edges: [] };
    expect(computeLayout(empty)).toEqual([]);
  });
});

describe("paperHulls", () => {
  it("returns one padded bounding box per paper that contains its own nodes", () => {
    const positioned = layeredLayout(fixture);
    const hulls = paperHulls(fixture, positioned);
    expect(hulls).toHaveLength(fixture.papers.length);

    for (const hull of hulls) {
      const own = positioned.filter((n) => n.paperId === hull.paperId);
      for (const node of own) {
        expect(node.x).toBeGreaterThanOrEqual(hull.x0);
        expect(node.x).toBeLessThanOrEqual(hull.x1);
        expect(node.y).toBeGreaterThanOrEqual(hull.y0);
        expect(node.y).toBeLessThanOrEqual(hull.y1);
      }
    }
  });
});
