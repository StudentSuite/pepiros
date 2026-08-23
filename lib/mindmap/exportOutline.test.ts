import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { buildMindmapOutline } from "./exportOutline";

const workspace = workspaceFixture as unknown as Workspace;

describe("buildMindmapOutline", () => {
  it("renders the paper as an H1 and each pillar as an H2, in contains order", () => {
    const { markdown, pillarOrder } = buildMindmapOutline(workspace, "p1");
    const paper = workspace.papers.find((p) => p.id === "p1")!;
    const paperNode = workspace.nodes.find((n) => n.type === "paper" && n.paperId === "p1")!;

    expect(markdown.startsWith(`# ${paper.title}`)).toBe(true);

    const pillarNodes = workspace.edges
      .filter((e) => e.kind === "contains" && e.sourceId === paperNode.id)
      .map((e) => workspace.nodes.find((n) => n.id === e.targetId)!)
      .filter((n) => n.type === "pillar");

    for (const pillar of pillarNodes) {
      expect(markdown).toContain(`## ${pillar.title}`);
    }
    expect(pillarOrder).toEqual(pillarNodes.map((p) => p.pillarIndex));
  });

  it("lists every leaf under its own pillar as a bullet, scoped to that paper", () => {
    const { markdown } = buildMindmapOutline(workspace, "p1");
    const paperLeaves = workspace.nodes.filter((n) => n.type === "leaf" && n.paperId === "p1");
    expect(paperLeaves.length).toBeGreaterThan(0);
    for (const leaf of paperLeaves) {
      expect(markdown).toContain(leaf.title);
    }

    // A different paper's leaves must not leak into this outline.
    const otherLeaf = workspace.nodes.find((n) => n.type === "leaf" && n.paperId === "p2");
    expect(otherLeaf).toBeDefined();
    expect(markdown).not.toContain(otherLeaf!.title);
  });

  it("suffixes a leaf with its weakest evidence tier, in the plan's own vocabulary", () => {
    const { markdown } = buildMindmapOutline(workspace, "p1");
    // Any tier mentioned must use the three canonical labels, never "verified".
    expect(markdown.toLowerCase()).not.toContain("verified");
    const hasTierSuffix = /\((quote located|paraphrase|unsupported)\)/.test(markdown);
    expect(hasTierSuffix).toBe(true);
  });

  it("returns an empty outline for an unknown paper id", () => {
    expect(buildMindmapOutline(workspace, "does-not-exist")).toEqual({ markdown: "", pillarOrder: [] });
  });

  it("escapes leading markdown-structure characters in a title so it can't inject new nodes", () => {
    const injected: Workspace = {
      ...workspace,
      nodes: workspace.nodes.map((n) =>
        n.id === "n-p1-methods" ? { ...n, title: "# Fake root\n- injected bullet" } : n,
      ),
    };
    const { markdown } = buildMindmapOutline(injected, "p1");
    expect(markdown).not.toContain("## # Fake root");
    expect(markdown).toContain("## Fake root");
  });
});
