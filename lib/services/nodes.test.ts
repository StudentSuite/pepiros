import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { createNode, findContradictions, getNode, getOutline, nodeDeepLink } from "./nodes";

const workspace = workspaceFixture as unknown as Workspace;
const WS = workspace.id;

describe("getOutline", () => {
  it("builds a paper -> pillar -> leaf tree from contains edges", async () => {
    const outline = await getOutline(WS);

    expect(outline.papers).toHaveLength(3);
    const p1 = outline.papers.find((p) => p.paperId === "p1")!;
    expect(p1.pillars.length).toBeGreaterThan(0);
    expect(p1.pillars.flatMap((pl) => pl.leaves).length).toBeGreaterThan(0);
  });

  // synthesis/thread nodes attach via derived_from/relates, not contains, so a
  // naive contains-only walk drops them entirely.
  it("includes cross-paper synthesis/thread nodes the contains tree cannot reach", async () => {
    const outline = await getOutline(WS);
    const ids = outline.crossPaper.map((n) => n.nodeId);
    expect(ids).toContain("n-synth-1");
    expect(ids).toContain("n-thread-1");
  });

  it("renders a compact indented text tree, not canvas JSON", async () => {
    const outline = await getOutline(WS);
    expect(outline.text).toContain("\n  "); // pillar indent
    expect(outline.text).toContain("\n    "); // leaf indent
    expect(outline.text).toContain("evidence)");
    expect(outline.text).not.toContain('"x":');
  });

  it("reports a real evidence count per leaf", async () => {
    const outline = await getOutline(WS);
    const leaves = outline.papers.flatMap((p) => p.pillars.flatMap((pl) => pl.leaves));
    const withEvidence = leaves.filter((l) => l.evidenceCount > 0);
    expect(withEvidence.length).toBeGreaterThan(0);
  });
});

describe("getNode", () => {
  it("resolves anchors inline to quote + page + deep link", async () => {
    const node = await getNode(WS, "n-p1-methods-leaf-1");
    expect(node).not.toBeNull();

    const located = node!.evidence.find((e) => e.tier === "quote_located")!;
    expect(located.quote).toBeTruthy();
    expect(located.page).toBe(4); // C1 lives on page 4 in the fixture
    expect(located.deepLink).toContain("/w/ws-1/canvas?node=");
  });

  // A dropped anchor has no page to point at; inventing one would imply a
  // located quote where the verifier decided there wasn't one.
  it("reports null page/quote for a dropped anchor rather than inventing one", async () => {
    const node = await getNode(WS, "n-p2-limitations-leaf-1");
    const dropped = node!.evidence.find((e) => e.evidenceId === "e6")!;
    expect(dropped.tier).toBe("unsupported");
    expect(dropped.quote).toBeNull();
    expect(dropped.page).toBeNull();
  });

  it("returns null for an unknown node instead of throwing", async () => {
    expect(await getNode(WS, "does-not-exist")).toBeNull();
  });
});

describe("createNode", () => {
  const c1 = workspace.chunks.find((c) => c.ordinal === 1)!;

  it("computes quote_located for a verbatim quote", async () => {
    const result = await createNode({
      workspaceId: WS,
      title: "From MCP",
      bodyMd: "A claim. [^n0]",
      claims: [{ refs: ["C1"], quote: c1.text }],
    });

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]!.tier).toBe("quote_located");
    expect(result.lowConfidence).toBe(false);
    expect(result.deepLink).toContain(result.nodeId);
  });

  // §13.2: "Never let a client assert quote_located." The whole point of the
  // tool re-verifying is that this fabricated quote cannot survive.
  it("drops the anchor and marks low-confidence when a client submits a bogus quote", async () => {
    const result = await createNode({
      workspaceId: WS,
      title: "Fabricated",
      bodyMd: "Made up. [^n0]",
      claims: [{ refs: ["C1"], quote: "The authors conclude the drug cures everything." }],
    });

    expect(result.evidence[0]!.tier).toBe("unsupported");
    expect(result.evidence[0]!.anchor).toBeNull();
    expect(result.lowConfidence).toBe(true);
    expect(result.droppedRefs).toContain("C1");
  });

  it("keeps passing refs and drops only the failing one in a multi-ref claim", async () => {
    const result = await createNode({
      workspaceId: WS,
      title: "Aggregate",
      bodyMd: "Two sources. [^n0]",
      claims: [{ refs: ["C1", "C2"], quote: c1.text }],
    });

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0]!.tier).toBe("quote_located"); // C1 is verbatim
    expect(result.evidence[1]!.tier).toBe("unsupported"); // same quote vs C2's text
    expect(result.lowConfidence).toBe(true);
  });

  // A model that returns the full context-block header instead of the bare id
  // is a real observed behaviour, not hypothetical -- see orchestrator.ts.
  it("normalizes a full context-block header down to the bare ref id", async () => {
    const result = await createNode({
      workspaceId: WS,
      title: "Header ref",
      bodyMd: "A claim. [^n0]",
      claims: [{ refs: ["C1 | Methods | p.4"], quote: c1.text }],
    });

    expect(result.evidence[0]!.refId).toBe("C1");
    expect(result.evidence[0]!.tier).toBe("quote_located");
  });

  it("rejects a parentId that does not exist", async () => {
    await expect(
      createNode({
        workspaceId: WS,
        parentId: "not-a-real-node",
        title: "Orphan",
        bodyMd: "x",
        claims: [],
      }),
    ).rejects.toThrow("does not exist");
  });
});

describe("findContradictions", () => {
  it("returns pairs with two-sided evidence and both quotes", async () => {
    const pairs = await findContradictions(WS);
    expect(pairs.length).toBeGreaterThan(0);

    const pair = pairs[0]!;
    expect(pair.left.quote).toBeTruthy();
    expect(pair.right.quote).toBeTruthy();
    expect(pair.left.deepLink).toContain("/canvas?node=");
    expect(pair.right.deepLink).toContain("/canvas?node=");
    expect(pair.left.nodeId).not.toBe(pair.right.nodeId);
  });

  it("filters by concept when given one", async () => {
    const all = await findContradictions(WS);
    const matching = await findContradictions(WS, "sleep");
    const nonsense = await findContradictions(WS, "zzzz-not-in-any-paper");

    expect(matching.length).toBeLessThanOrEqual(all.length);
    expect(nonsense).toHaveLength(0);
  });
});

describe("nodeDeepLink", () => {
  it("url-encodes ids so a deep link survives an odd node id", () => {
    expect(nodeDeepLink("ws 1", "node/1")).toContain("ws%201");
    expect(nodeDeepLink("ws 1", "node/1")).toContain("node%2F1");
  });
});
