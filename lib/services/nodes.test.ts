import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { db } from "@/lib/db/client";
import { nodeVersions, workspaces } from "@/lib/db/schema";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
import { getIngestedWorkspace, setIngestedWorkspace } from "./ingestStore";

// expandNode's `custom` generator calls fastModel() -- mocked at the
// LanguageModelV2 level (same pattern as synthesis.test.ts/chat.test.ts) so
// this runs with no API key or network. None of this file's other tests
// (createNode/deleteNode/promoteToThread/updateNodeBody) invoke an LLM at
// all, so mocking this here doesn't affect them.
vi.mock("@/lib/ai/client", () => ({
  fastModel: () =>
    mockTextModel(
      JSON.stringify({
        title: "Followup answer",
        body_md: "Participants were randomized 1:1 to receive bright light exposure.[^n0]",
        evidence: [{ refs: ["C1"], quote: "Participants were randomized 1:1 to receive bright light exposure." }],
        confidence: "high",
        followups: [],
      }),
    ),
  strongModel: () => mockTextModel("{}"),
  visionModel: () => mockTextModel("{}"),
}));

import {
  createNode,
  deleteNode,
  expandNode,
  findContradictions,
  getNode,
  getOutline,
  nodeDeepLink,
  promoteToThread,
  updateNodeBody,
} from "./nodes";

const workspace = workspaceFixture as unknown as Workspace;
const WS = workspace.id;

// createNode/updateNodeBody/deleteNode/promoteToThread below all persist
// into the real "ws-1" row (lib/db/queries) -- delete it after every test
// (cascades to every child table) so the next test's fetchWorkspace("ws-1")
// reads the pristine fixture again instead of accumulating every prior
// test's writes on top of it. Without this, repeated local runs against the
// same Postgres instance pile up "mcp-..." nodes across runs, and a fuzzy-
// overlap search like promoteToThread's can start matching leftover debris
// instead of the fixture node a test actually expects -- CI itself never
// hit this (a fresh ephemeral Postgres container every run), but any local
// re-run against a persistent test DB eventually does.
afterEach(async () => {
  await db.delete(workspaces).where(eq(workspaces.id, WS));
});

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

describe("updateNodeBody", () => {
  const c1 = workspace.chunks.find((c) => c.ordinal === 1)!;

  it("keeps a quote_located badge when the edit still matches the source, and records a version row", async () => {
    const created = await createNode({
      workspaceId: WS,
      title: "Editable",
      bodyMd: `A claim. [^n0]`,
      claims: [{ refs: ["C1"], quote: c1.text }],
    });
    const evidenceId = created.evidence[0]!.id;
    const originalBody = created.bodyMd;

    const { node, evidence } = await updateNodeBody({
      workspaceId: WS,
      nodeId: created.nodeId,
      bodyMd: `${c1.text}[^${evidenceId}]`,
    });

    expect(evidence[0]!.tier).toBe("quote_located");
    expect(node.bodyMd).toContain(`[^${evidenceId}]`);

    const versions = await db.select().from(nodeVersions).where(eq(nodeVersions.nodeId, created.nodeId));
    expect(versions.some((v) => v.bodyMd === originalBody)).toBe(true);
  });

  it("downgrades a quote_located badge to unsupported and strips the marker when the edit no longer matches the source", async () => {
    const created = await createNode({
      workspaceId: WS,
      title: "Editable, then rewritten",
      bodyMd: `A claim. [^n0]`,
      claims: [{ refs: ["C1"], quote: c1.text }],
    });
    const evidenceId = created.evidence[0]!.id;
    expect(created.evidence[0]!.tier).toBe("quote_located");

    const { node, evidence } = await updateNodeBody({
      workspaceId: WS,
      nodeId: created.nodeId,
      bodyMd: `Something the source never says.[^${evidenceId}]`,
    });

    expect(evidence[0]!.tier).toBe("unsupported");
    expect(evidence[0]!.anchor).toBeNull();
    expect(node.bodyMd).not.toContain(`[^${evidenceId}]`);

    const after = await getIngestedWorkspace(WS);
    const persisted = after!.workspace.evidence.find((e) => e.id === evidenceId)!;
    expect(persisted.tier).toBe("unsupported");
  });

  it("rejects a nodeId that does not exist", async () => {
    await expect(
      updateNodeBody({ workspaceId: WS, nodeId: "not-a-real-node", bodyMd: "x" }),
    ).rejects.toThrow("does not exist");
  });
});

describe("expandNode", () => {
  // Issue #160: expandNode used to read via bare fetchWorkspace() and never
  // persist its result at all -- a followup-chip node only ever lived in
  // the client's optimistic zustand state and vanished on refresh, the
  // same P0 class of bug #51 already fixed for createNode/promoteToThread.
  it("persists the expanded node, its derived_from edge, and its evidence", async () => {
    const result = await expandNode({
      workspaceId: WS,
      nodeId: "n-p1-methods-leaf-1",
      question: "How was randomization actually implemented?",
    });

    expect(result.evidence.some((e) => e.tier === "quote_located")).toBe(true);

    const after = await getIngestedWorkspace(WS);
    expect(after).not.toBeUndefined();
    expect(after!.workspace.nodes.some((n) => n.id === result.node.id)).toBe(true);
    expect(
      after!.workspace.edges.some(
        (e) => e.id === result.edge.id && e.sourceId === result.node.id && e.targetId === "n-p1-methods-leaf-1",
      ),
    ).toBe(true);
    expect(after!.workspace.evidence.some((e) => e.nodeId === result.node.id)).toBe(true);
  });
});

describe("deleteNode", () => {
  it("cascades the node's own evidence/edges and marks a content-dependent referencer stale, but not a purely structural contains parent", async () => {
    // n-p1-key-finding-leaf-1 has two edges pointing at it in the static
    // fixture: e-4 (contains, from its parent pillar n-p1-key-finding) and
    // e-21 (derived_from, from n-thread-1) -- exercises both branches at
    // once. Asserted against the raw fixture import, not a live fetch: this
    // test permanently deletes the node from whatever real row it runs
    // against (same "the DB accumulates real writes across runs" trade-off
    // createNode's own tests already accept, just in the removal direction),
    // so a live fetch here would only prove today's specific run order.
    expect(workspace.edges.some((e) => e.targetId === "n-p1-key-finding-leaf-1" && e.kind === "contains")).toBe(true);
    expect(workspace.edges.some((e) => e.targetId === "n-p1-key-finding-leaf-1" && e.kind === "derived_from")).toBe(
      true,
    );

    const result = await deleteNode({ workspaceId: WS, nodeId: "n-p1-key-finding-leaf-1" });

    expect(result.staleNodeIds).toEqual(["n-thread-1"]);
    expect(result.staleNodeIds).not.toContain("n-p1-key-finding");

    const after = await getIngestedWorkspace(WS);
    expect(after).not.toBeUndefined();
    expect(after!.workspace.nodes.some((n) => n.id === "n-p1-key-finding-leaf-1")).toBe(false);
    expect(
      after!.workspace.edges.some(
        (e) => e.sourceId === "n-p1-key-finding-leaf-1" || e.targetId === "n-p1-key-finding-leaf-1",
      ),
    ).toBe(false);
    expect(after!.workspace.evidence.some((e) => e.nodeId === "n-p1-key-finding-leaf-1")).toBe(false);

    const thread = after!.workspace.nodes.find((n) => n.id === "n-thread-1")!;
    expect(thread.stale).toBe(true);
    const parentPillar = after!.workspace.nodes.find((n) => n.id === "n-p1-key-finding")!;
    expect(parentPillar.stale).toBe(false);
  });

  it("rejects a nodeId that does not exist", async () => {
    await expect(deleteNode({ workspaceId: WS, nodeId: "not-a-real-node" })).rejects.toThrow("does not exist");
  });

  // Issue #161: deleteNode used to always resave the unmodified base first
  // (a separate version-checked write) then delete as a second, unversioned
  // step -- two unrelated concurrent deletes on an already-ingested
  // workspace could spuriously conflict, since whichever resave committed
  // first bumped the version out from under the other's in-flight resave.
  it("lets two concurrent deletes of unrelated nodes both succeed once the workspace is already ingested", async () => {
    // Force a real ingested row to exist first -- the race this guards
    // against only happens on an *already*-ingested workspace, not the
    // one-time fixture-to-real-row transition.
    await setIngestedWorkspace(workspace);

    const [a, b] = await Promise.all([
      deleteNode({ workspaceId: WS, nodeId: "n-p2-key-finding-leaf-2" }),
      deleteNode({ workspaceId: WS, nodeId: "n-p3-methods-leaf-1" }),
    ]);

    expect(a).toBeDefined();
    expect(b).toBeDefined();

    const after = await getIngestedWorkspace(WS);
    expect(after!.workspace.nodes.some((n) => n.id === "n-p2-key-finding-leaf-2")).toBe(false);
    expect(after!.workspace.nodes.some((n) => n.id === "n-p3-methods-leaf-1")).toBe(false);
  });
});

describe("promoteToThread", () => {
  it("writes derived_from + relates to the best-overlapping node in each of the two papers it actually cites", async () => {
    const c1 = workspace.chunks.find((c) => c.ordinal === 1)!; // c-p1-methods-1, cited by n-p1-methods-leaf-1
    const c8 = workspace.chunks.find((c) => c.ordinal === 8)!; // c-p3-methods-1, cited by n-p3-methods-leaf-1

    const result = await promoteToThread({
      workspaceId: WS,
      title: "Cross-paper methods comparison",
      bodyMd: "P1 used a light-exposure protocol. [^n0] P3 used a longer observational design. [^n1]",
      claims: [
        { refs: ["C1"], quote: c1.text },
        { refs: ["C8"], quote: c8.text },
      ],
    });

    expect(result.node.type).toBe("thread");
    expect(result.node.paperId).toBeNull();
    expect(result.node.pillarIndex).toBeNull();
    expect(result.lowConfidence).toBe(false);
    expect(result.evidence.every((e) => e.tier === "quote_located")).toBe(true);

    expect(result.edges).toHaveLength(2);
    const kinds = result.edges.map((e) => e.kind).sort();
    expect(kinds).toEqual(["derived_from", "relates"]);
    const targets = result.edges.map((e) => e.targetId).sort();
    expect(targets).toEqual(["n-p1-methods-leaf-1", "n-p3-methods-leaf-1"]);
    expect(result.edges.every((e) => e.sourceId === result.node.id)).toBe(true);
  });

  it("writes no edges when the only cited ref fails re-verification, even though a real node also cites it", async () => {
    // C1 really is cited by n-p1-methods-leaf-1 in the fixture -- this proves
    // overlap is scored against *this thread's own verified* refIds, not
    // just whatever ref string the caller mentioned, so a claim that gets
    // dropped as unsupported can't still pull in a derived_from edge.
    const result = await promoteToThread({
      workspaceId: WS,
      title: "Standalone thread",
      bodyMd: "Nothing here overlaps with an existing node. [^n0]",
      claims: [{ refs: ["C1"], quote: "This text does not match the real chunk, so it resolves unsupported." }],
    });

    expect(result.lowConfidence).toBe(true);
    expect(result.evidence[0]!.tier).toBe("unsupported");
    expect(result.edges).toEqual([]);
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
