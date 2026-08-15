import { describe, expect, it } from "vitest";
import type { EdgeKind, Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import {
  EDGE_KIND_MEANINGS,
  NODE_TYPE_MEANINGS,
  presentEdgeKinds,
  presentNodeTypes,
  presentPillars,
} from "./legend";

const workspace = workspaceFixture as unknown as Workspace;

/** Every kind the schema allows, so a new one cannot be added unexplained. */
const ALL_EDGE_KINDS: EdgeKind[] = [
  "contains",
  "relates",
  "derived_from",
  "agrees",
  "contradicts",
  "extends",
  "shares_method",
  "cites",
];

describe("legend coverage", () => {
  // A legend that silently omits a kind is worse than no legend: the reader
  // trusts it as complete and concludes the unexplained line means nothing.
  it("explains every edge kind the schema defines", () => {
    const explained = new Set(EDGE_KIND_MEANINGS.map((m) => m.kind));
    for (const kind of ALL_EDGE_KINDS) {
      expect(explained.has(kind), `no legend entry for edge kind "${kind}"`).toBe(true);
    }
    expect(EDGE_KIND_MEANINGS).toHaveLength(ALL_EDGE_KINDS.length);
  });

  it("explains every node type", () => {
    const explained = NODE_TYPE_MEANINGS.map((m) => m.type);
    expect(explained).toEqual(
      expect.arrayContaining(["paper", "pillar", "leaf", "synthesis", "thread"]),
    );
  });

  it("gives each entry a real explanation, not a restated label", () => {
    for (const m of EDGE_KIND_MEANINGS) {
      expect(m.meaning.length, `"${m.kind}" has no meaning text`).toBeGreaterThan(15);
      expect(m.meaning.toLowerCase()).not.toBe(m.label.toLowerCase());
    }
  });

  // The tier wording is load-bearing: plan.md §4 bans calling a located quote
  // "verified", and a legend is exactly where that slip would happen.
  it("never describes a located quote as verified", () => {
    const allText = EDGE_KIND_MEANINGS.map((m) => m.meaning).join(" ").toLowerCase();
    expect(allText).not.toContain("verified");
  });
});

describe("presentEdgeKinds", () => {
  it("returns only kinds the workspace actually draws", () => {
    const present = presentEdgeKinds(workspace).map((m) => m.kind);
    const actual = new Set(workspace.edges.map((e) => e.kind));

    expect(present.length).toBeGreaterThan(0);
    for (const kind of present) expect(actual.has(kind)).toBe(true);
    // The fixture does not use every kind, so this must be a real subset --
    // otherwise the filter isn't filtering.
    expect(present.length).toBeLessThan(EDGE_KIND_MEANINGS.length);
  });

  it("keeps the declared order rather than edge order", () => {
    const present = presentEdgeKinds(workspace).map((m) => m.kind);
    const declared = EDGE_KIND_MEANINGS.map((m) => m.kind).filter((k) => present.includes(k));
    expect(present).toEqual(declared);
  });

  it("returns nothing for a workspace with no edges", () => {
    expect(presentEdgeKinds({ ...workspace, edges: [] })).toEqual([]);
  });
});

describe("presentPillars", () => {
  it("lists each pillar hue in use once, with a title", () => {
    const pillars = presentPillars(workspace);
    expect(pillars.length).toBeGreaterThan(0);

    const indices = pillars.map((p) => p.index);
    expect(new Set(indices).size).toBe(indices.length); // no duplicate hue rows
    expect([...indices]).toEqual([...indices].sort((a, b) => a - b));
    for (const p of pillars) expect(p.title.length).toBeGreaterThan(0);
  });

  it("does not invent hues the workspace never uses", () => {
    const used = new Set(
      workspace.nodes
        .filter((n) => n.type === "pillar" && n.pillarIndex !== null)
        .map((n) => n.pillarIndex),
    );
    for (const p of presentPillars(workspace)) expect(used.has(p.index)).toBe(true);
  });
});

describe("presentNodeTypes", () => {
  it("returns only types present in the workspace", () => {
    const present = presentNodeTypes(workspace).map((m) => m.type);
    const actual = new Set(workspace.nodes.map((n) => n.type));
    for (const t of present) expect(actual.has(t)).toBe(true);
  });
});
