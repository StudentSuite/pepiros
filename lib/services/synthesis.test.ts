import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
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
}));

afterEach(() => {
  strongQueue = [];
  // runSynthesis persists into the shared in-memory ingestStore keyed by
  // workspaceId ("ws-1") -- clear it so other test files reading the
  // pristine fixture via fetchWorkspace("ws-1") aren't affected.
  delete (globalThis as { __pepirosIngestedWorkspaces?: unknown }).__pepirosIngestedWorkspaces;
});

import { runSynthesis } from "./synthesis";

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

    expect(result.synthesisNodesWritten).toHaveLength(1);
    expect(result.synthesisNodesWritten[0]).toMatchObject({ type: "synthesis", title: "Contradictions" });
  });

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
  });

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
  });
});
