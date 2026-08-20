import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { eq } from "drizzle-orm";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";
import workspaceFixture from "@/fixtures/workspace.json";
import type { Workspace } from "@/types/anchor";

/**
 * strongModel is mocked at the LanguageModelV2 level (same pattern as
 * lib/services/chat.test.ts), so this runs with no API key or network. The
 * fixture's real chunk text is reused as the "quote" in mocked responses so
 * lib/services/nodes.ts's createNode() -- which this module calls for
 * real, unmocked -- actually verifies each side against the real corpus.
 */
let strongQueue: LanguageModelV2[] = [];
vi.mock("@/lib/ai/client", () => ({
  strongModel: () => strongQueue.shift() ?? mockTextModel("{}"),
  fastModel: () => mockTextModel("{}"),
  visionModel: () => mockTextModel("{}"),
}));

afterEach(async () => {
  strongQueue = [];
  // runSynthesis persists into the real "ws-1" workspace row (lib/db/queries)
  // -- delete it (cascades to every child table) so the next test's
  // fetchWorkspace("ws-1") reads the pristine fixture again, not the
  // previous test's synthesis output piled on top of it.
  await db.delete(workspaces).where(eq(workspaces.id, "ws-1"));
});

import { runSynthesis } from "./synthesis";
import { getIngestedWorkspace } from "./ingestStore";
import { getOutline } from "./nodes";

const workspace = workspaceFixture as unknown as Workspace;
const p1Chunk = workspace.chunks.find((c) => c.paperId === "p1")!;
const p2Chunk = workspace.chunks.find((c) => c.paperId === "p2")!;
const p3Chunk = workspace.chunks.find((c) => c.paperId === "p3")!;

function relationResponse(input: {
  relation: string;
  summaryA: string;
  refA: string;
  quoteA: string;
  summaryB: string;
  refB: string;
  quoteB: string;
}) {
  return mockTextModel(JSON.stringify(input));
}

describe("runSynthesis", () => {
  // 15s, not the 5s default: runSynthesis now round-trips real Postgres
  // (lib/db/queries) for every fetchWorkspace/createNode call instead of an
  // in-memory Map, and each test pays that network latency several times over.
  it("writes a two-sided contradicts edge and a Contradictions synthesis node when both quotes verify", async () => {
    strongQueue = [
      relationResponse({
        relation: "contradicts",
        summaryA: "Paper A finds bright light improves sleep onset.",
        refA: `C${p1Chunk.ordinal}`,
        quoteA: p1Chunk.text,
        summaryB: "Paper B finds no such effect.",
        refB: `C${p2Chunk.ordinal}`,
        quoteB: p2Chunk.text,
      }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    ];

    const result = await runSynthesis("ws-1");

    expect(result.pairsCompared).toBe(3);
    expect(result.rejected).toHaveLength(2);

    const contradictsEdges = result.edgesWritten.filter((e) => e.kind === "contradicts");
    expect(contradictsEdges).toHaveLength(1);

    // Not an exact-length assertion: the fixture's 3 papers have real,
    // distinct years and archetypes, so the deterministic Timeline/
    // Methodological Divergence nodes (issue #95) always write alongside
    // whatever the LLM pass itself produced -- asserting length here would
    // just be re-testing those two, not this test's actual subject.
    const contradictionsNode = result.synthesisNodesWritten.find((n) => n.title === "Contradictions");
    expect(contradictionsNode).toMatchObject({ type: "synthesis", title: "Contradictions" });

    // Regression check: each side's leaf node body must carry the *real*
    // evidence marker ("[^<evidenceId>]"), not the notional "[^n0]" createNode's
    // input contract uses -- otherwise InlineRefs/stripRefMarkers (which only
    // recognize "[^eN]"-shaped ids) never render a citation chip and the
    // literal text "[^n0]" leaks into the UI.
    const contradictsEdge = contradictsEdges[0]!;
    const merged = (await getIngestedWorkspace("ws-1"))!.workspace;
    const sideNodeA = merged.nodes.find((n) => n.id === contradictsEdge.sourceId)!;
    const sideNodeB = merged.nodes.find((n) => n.id === contradictsEdge.targetId)!;
    expect(sideNodeA.bodyMd).not.toContain("[^n0]");
    expect(sideNodeB.bodyMd).not.toContain("[^n0]");
    expect(sideNodeA.bodyMd).toMatch(/\[\^[\w-]+\]/);
    expect(sideNodeB.bodyMd).toMatch(/\[\^[\w-]+\]/);
  }, 15000);

  it("rejects a pair when one side's quote does not verify against its own paper (two-sided evidence invariant)", async () => {
    strongQueue = [
      relationResponse({
        relation: "contradicts",
        summaryA: "Real quote from paper A.",
        refA: `C${p1Chunk.ordinal}`,
        quoteA: p1Chunk.text,
        // Fabricated quote attributed to paper B's ref -- will not fuzzy-match
        // that chunk's real text, so this side should fail verification.
        summaryB: "Fabricated claim.",
        refB: `C${p2Chunk.ordinal}`,
        quoteB: "This sentence was never written anywhere in this paper's actual text.",
      }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    ];

    const result = await runSynthesis("ws-1");

    expect(result.edgesWritten.filter((e) => e.kind === "contradicts")).toHaveLength(0);
    expect(result.rejected.some((r) => r.reason.includes("did not verify"))).toBe(true);
  }, 15000);

  it("writes a Consensus node for an agrees relation", async () => {
    strongQueue = [
      relationResponse({
        relation: "agrees",
        summaryA: "Both find an effect on cognition.",
        refA: `C${p1Chunk.ordinal}`,
        quoteA: p1Chunk.text,
        summaryB: "Confirms the same direction of effect.",
        refB: `C${p2Chunk.ordinal}`,
        quoteB: p2Chunk.text,
      }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    ];

    const result = await runSynthesis("ws-1");

    expect(result.edgesWritten.some((e) => e.kind === "agrees")).toBe(true);
    expect(result.synthesisNodesWritten.some((n) => n.title === "Consensus")).toBe(true);
  }, 15000);

  // Both nodes below are deterministic (no LLM judge, issue #95) -- every
  // pairwise comparison is still mocked as "none" so this isolates them
  // from the LLM-classified Consensus/Contradictions nodes.
  const noneResponses = [
    relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p2Chunk.ordinal}`, quoteB: p2Chunk.text }),
    relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
  ];

  it("writes a Timeline of Findings node ordering the fixture's 3 dated papers chronologically", async () => {
    strongQueue = [...noneResponses];

    const result = await runSynthesis("ws-1");

    const timeline = result.synthesisNodesWritten.find((n) => n.title === "Timeline of Findings");
    expect(timeline).toBeDefined();
    // Fixture years: p1 2022, p2 2021, p3 2023 -- p2 (earliest) must precede p1, which must precede p3.
    const body = timeline!.bodyMd;
    expect(body.indexOf("2021")).toBeLessThan(body.indexOf("2022"));
    expect(body.indexOf("2022")).toBeLessThan(body.indexOf("2023"));
  }, 15000);

  it("writes a Methodological Divergence node grouping the fixture's 3 distinct archetypes", async () => {
    strongQueue = [...noneResponses];

    const result = await runSynthesis("ws-1");

    const divergence = result.synthesisNodesWritten.find((n) => n.title === "Methodological Divergence");
    expect(divergence).toBeDefined();
    // Fixture archetypes: p1 rct, p2 systematic_review, p3 cohort_study.
    expect(divergence!.bodyMd).toContain("RCT");
    expect(divergence!.bodyMd).toContain("Systematic review");
    expect(divergence!.bodyMd).toContain("Cohort study");
  }, 15000);

  // Issue #172: without a parentId, createNode() used to default every
  // pairwise leaf's paperId to base.papers[0]?.id -- the workspace's *first*
  // paper, regardless of which side it actually was. Loop order visits
  // (p1,p2), (p1,p3), (p2,p3) in that sequence, so the p2-vs-p3 pair (the
  // third comparison) is the one that would have been wrong under the old
  // code: neither side is p1, so both would have collapsed onto it.
  it("gives each pairwise leaf the paperId of the side it's actually about, not always the workspace's first paper", async () => {
    strongQueue = [
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p2Chunk.ordinal}`, quoteB: p2Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({
        relation: "contradicts",
        summaryA: "Paper 2's position.",
        refA: `C${p2Chunk.ordinal}`,
        quoteA: p2Chunk.text,
        summaryB: "Paper 3's position.",
        refB: `C${p3Chunk.ordinal}`,
        quoteB: p3Chunk.text,
      }),
    ];

    const result = await runSynthesis("ws-1");

    const edge = result.edgesWritten.find((e) => e.kind === "contradicts");
    expect(edge).toBeDefined();
    const merged = (await getIngestedWorkspace("ws-1"))!.workspace;
    const nodeA = merged.nodes.find((n) => n.id === edge!.sourceId)!;
    const nodeB = merged.nodes.find((n) => n.id === edge!.targetId)!;
    expect(nodeA.paperId).toBe("p2");
    expect(nodeB.paperId).toBe("p3");
  }, 15000);

  // Issue #174: verification only ever checked that a claim's quote
  // fuzzy-matches *some* chunk with the cited ref -- never that the chunk
  // belongs to the paper the side is supposed to be about. Here side A
  // cites paper B's own chunk/ref while claiming to be paper A's position, a
  // stand-in for a generator mislabeling which side supports which claim.
  it("rejects a pair when a side's quote resolves to a chunk from the wrong paper", async () => {
    strongQueue = [
      relationResponse({
        relation: "contradicts",
        summaryA: "Mislabeled: actually paper B's text.",
        refA: `C${p2Chunk.ordinal}`,
        quoteA: p2Chunk.text,
        summaryB: "Paper B's real position.",
        refB: `C${p2Chunk.ordinal}`,
        quoteB: p2Chunk.text,
      }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    ];

    const result = await runSynthesis("ws-1");

    expect(result.edgesWritten.filter((e) => e.kind === "contradicts")).toHaveLength(0);
    expect(result.rejected.some((r) => r.reason.includes("different paper"))).toBe(true);
  }, 15000);

  // Issue #173: a pairwise leaf's `contains` edge lands directly on its
  // paper node, skipping the pillar level entirely -- getOutline() used to
  // only descend paper -> pillar -> leaf, so these nodes never appeared in
  // the outline (or the pepiros://workspace/{id}/outline MCP resource, which
  // renders straight from this same text) despite backing a real edge.
  it("surfaces a pairwise leaf under its paper's otherLeaves in getOutline, not just as a dangling node", async () => {
    strongQueue = [
      relationResponse({
        relation: "contradicts",
        summaryA: "Paper A's position.",
        refA: `C${p1Chunk.ordinal}`,
        quoteA: p1Chunk.text,
        summaryB: "Paper B's position.",
        refB: `C${p2Chunk.ordinal}`,
        quoteB: p2Chunk.text,
      }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    ];

    await runSynthesis("ws-1");
    const outline = await getOutline("ws-1");

    const paperA = outline.papers.find((p) => p.paperId === "p1")!;
    const paperB = outline.papers.find((p) => p.paperId === "p2")!;
    expect(paperA.otherLeaves.some((l) => l.title.includes("contradicts position"))).toBe(true);
    expect(paperB.otherLeaves.some((l) => l.title.includes("contradicts position"))).toBe(true);
    expect(outline.text).toContain("contradicts position");
  }, 15000);

  // Issue #175: node/edge ids used to be randomUUID()-based, so a second
  // POST /api/compare on an already-synthesized workspace duplicated every
  // pairwise leaf and relation edge instead of updating them in place.
  it("does not duplicate nodes or edges when run twice on the same workspace", async () => {
    const responses = () => [
      relationResponse({
        relation: "contradicts",
        summaryA: "Paper A's position.",
        refA: `C${p1Chunk.ordinal}`,
        quoteA: p1Chunk.text,
        summaryB: "Paper B's position.",
        refB: `C${p2Chunk.ordinal}`,
        quoteB: p2Chunk.text,
      }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p1Chunk.ordinal}`, quoteA: p1Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
      relationResponse({ relation: "none", summaryA: "", refA: `C${p2Chunk.ordinal}`, quoteA: p2Chunk.text, summaryB: "", refB: `C${p3Chunk.ordinal}`, quoteB: p3Chunk.text }),
    ];

    strongQueue = responses();
    await runSynthesis("ws-1");
    strongQueue = responses();
    await runSynthesis("ws-1");

    const merged = (await getIngestedWorkspace("ws-1"))!.workspace;
    const pairwiseLeaves = merged.nodes.filter((n) => n.title.includes("contradicts position"));
    // Scoped to this pair's own deterministic id, not `kind === "contradicts"`
    // generally: the fixture itself already ships one unrelated planted
    // contradiction edge ("e-20", p2 vs p3's key findings), so a raw
    // kind-only count would be off by one regardless of duplication.
    const thisRelationEdge = merged.edges.filter((e) => e.id === "synth-r-p1-p2");
    expect(pairwiseLeaves).toHaveLength(2);
    expect(thisRelationEdge).toHaveLength(1);
  }, 20000);
});
