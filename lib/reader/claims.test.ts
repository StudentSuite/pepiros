import { describe, expect, it } from "vitest";
import type { Chunk, Evidence, GraphNode } from "@/types/anchor";
import { buildClaimSummaries, sortClaims } from "./claims";

function node(overrides: Partial<GraphNode> & Pick<GraphNode, "id">): GraphNode {
  return {
    workspaceId: "ws-1",
    type: "leaf",
    title: "Claim",
    bodyMd: "",
    pillarIndex: null,
    x: 0,
    y: 0,
    paperId: "p-1",
    stale: false,
    ...overrides,
  };
}

function evidence(overrides: Partial<Evidence> & Pick<Evidence, "id" | "nodeId">): Evidence {
  return {
    refId: "C1",
    anchor: null,
    tier: "quote_located",
    matchScore: 0.95,
    numericOk: null,
    ...overrides,
  };
}

function chunk(overrides: Partial<Chunk> & Pick<Chunk, "id">): Chunk {
  return {
    paperId: "p-1",
    sectionId: null,
    kind: "prose",
    page: 1,
    text: "",
    ordinal: 0,
    rects: [],
    ...overrides,
  };
}

describe("buildClaimSummaries", () => {
  it("picks the weakest cited evidence row, not the strongest", () => {
    const n = node({ id: "n-1", bodyMd: "Fast [^e1] and slow [^e2]." });
    const evList = [
      evidence({ id: "e1", nodeId: "n-1", tier: "quote_located", matchScore: 0.99 }),
      evidence({ id: "e2", nodeId: "n-1", tier: "unsupported", matchScore: 0.4 }),
    ];
    const [summary] = buildClaimSummaries([n], evList, []);
    expect(summary!.weakestTier).toBe("unsupported");
    expect(summary!.weakestEvidence!.id).toBe("e2");
  });

  it("resolves the weakest evidence row's page via its anchor's chunk", () => {
    const n = node({ id: "n-1", bodyMd: "Claim [^e1]." });
    const evList = [
      evidence({
        id: "e1",
        nodeId: "n-1",
        anchor: { chunkId: "c-1", quote: "q", spans: [] },
      }),
    ];
    const chunks = [chunk({ id: "c-1", page: 4 })];
    const [summary] = buildClaimSummaries([n], evList, chunks);
    expect(summary!.page).toBe(4);
  });

  it("has no page when the weakest evidence has no anchor", () => {
    const n = node({ id: "n-1", bodyMd: "Claim [^e1]." });
    const evList = [evidence({ id: "e1", nodeId: "n-1", tier: "unsupported", anchor: null })];
    const [summary] = buildClaimSummaries([n], evList, []);
    expect(summary!.page).toBeNull();
  });

  it("reports no weakest tier for a claim with no resolvable citation", () => {
    const n = node({ id: "n-1", bodyMd: "No citations here." });
    const [summary] = buildClaimSummaries([n], [], []);
    expect(summary!.weakestTier).toBeNull();
    expect(summary!.weakestEvidence).toBeNull();
  });
});

describe("sortClaims", () => {
  const chunks = [chunk({ id: "c-1", page: 1 }), chunk({ id: "c-2", page: 9 })];

  it("orders weakest tier first by default", () => {
    const nodes = [
      node({ id: "strong", bodyMd: "[^e1]" }),
      node({ id: "weak", bodyMd: "[^e2]" }),
      node({ id: "mid", bodyMd: "[^e3]" }),
    ];
    const evList = [
      evidence({ id: "e1", nodeId: "strong", tier: "quote_located" }),
      evidence({ id: "e2", nodeId: "weak", tier: "unsupported" }),
      evidence({ id: "e3", nodeId: "mid", tier: "paraphrase" }),
    ];
    const summaries = buildClaimSummaries(nodes, evList, chunks);
    const order = sortClaims(summaries, "weakest").map((s) => s.node.id);
    expect(order).toEqual(["weak", "mid", "strong"]);
  });

  it("breaks a tier tie by match score ascending, weakest score first", () => {
    const nodes = [node({ id: "a", bodyMd: "[^e1]" }), node({ id: "b", bodyMd: "[^e2]" })];
    const evList = [
      evidence({ id: "e1", nodeId: "a", tier: "paraphrase", matchScore: 0.85 }),
      evidence({ id: "e2", nodeId: "b", tier: "paraphrase", matchScore: 0.78 }),
    ];
    const summaries = buildClaimSummaries(nodes, evList, chunks);
    const order = sortClaims(summaries, "weakest").map((s) => s.node.id);
    expect(order).toEqual(["b", "a"]);
  });

  it("orders by page ascending, with no-anchor claims sorted last", () => {
    const nodes = [
      node({ id: "no-page", bodyMd: "[^e1]" }),
      node({ id: "page-9", bodyMd: "[^e2]" }),
      node({ id: "page-1", bodyMd: "[^e3]" }),
    ];
    const evList = [
      evidence({ id: "e1", nodeId: "no-page", tier: "unsupported", anchor: null }),
      evidence({ id: "e2", nodeId: "page-9", anchor: { chunkId: "c-2", quote: "q", spans: [] } }),
      evidence({ id: "e3", nodeId: "page-1", anchor: { chunkId: "c-1", quote: "q", spans: [] } }),
    ];
    const summaries = buildClaimSummaries(nodes, evList, chunks);
    const order = sortClaims(summaries, "page").map((s) => s.node.id);
    expect(order).toEqual(["page-1", "page-9", "no-page"]);
  });

  it("orders by pillar index ascending, with no-pillar claims sorted last", () => {
    const nodes = [
      node({ id: "no-pillar", pillarIndex: null }),
      node({ id: "pillar-2", pillarIndex: 2 }),
      node({ id: "pillar-1", pillarIndex: 1 }),
    ];
    const summaries = buildClaimSummaries(nodes, [], []);
    const order = sortClaims(summaries, "pillar").map((s) => s.node.id);
    expect(order).toEqual(["pillar-1", "pillar-2", "no-pillar"]);
  });

  it("is stable (preserves original order) for equal sort keys", () => {
    const nodes = [node({ id: "first" }), node({ id: "second" })];
    const summaries = buildClaimSummaries(nodes, [], []);
    const order = sortClaims(summaries, "weakest").map((s) => s.node.id);
    expect(order).toEqual(["first", "second"]);
  });
});
