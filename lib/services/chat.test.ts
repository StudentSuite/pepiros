import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
import { answerQuestion, extractCitedRefs, rewriteQuestion } from "./chat";

/**
 * The model is mocked at the LanguageModelV2 level, so these run with no API
 * key and no network. `fastModel`/`strongModel` are queued separately because
 * one answerQuestion call uses fast twice (rewrite, route) then strong once.
 */
let fastQueue: LanguageModelV2[] = [];
let strongQueue: LanguageModelV2[] = [];

vi.mock("@/lib/ai/client", () => ({
  fastModel: () => fastQueue.shift() ?? mockTextModel("{}"),
  strongModel: () => strongQueue.shift() ?? mockTextModel(""),
}));

/** classifyRoute uses generateObject in schema mode, so the shape is { route }. */
function routeResponse(value: string) {
  return mockTextModel(JSON.stringify({ route: value }));
}

afterEach(() => {
  fastQueue = [];
  strongQueue = [];
});

describe("extractCitedRefs", () => {
  it("pulls bare C/N ids out of prose", () => {
    expect(extractCitedRefs("Sleep fell [C2] and memory rose [N3].")).toEqual(["C2", "N3"]);
  });

  it("dedupes a ref cited twice", () => {
    expect(extractCitedRefs("[C1] and again [C1]")).toEqual(["C1"]);
  });

  it("ignores a full bracketed header, which is not a valid citation", () => {
    expect(extractCitedRefs("[C7 | Methods | p.4] is context, not a citation")).toEqual([]);
  });

  it("returns nothing for uncited prose", () => {
    expect(extractCitedRefs("No citations at all here.")).toEqual([]);
  });
});

describe("rewriteQuestion", () => {
  it("returns the question unchanged when there is no history", async () => {
    // No model should be consulted at all in this case.
    expect(await rewriteQuestion("What did it find?", [])).toBe("What did it find?");
  });

  it("resolves a follow-up against recent turns", async () => {
    fastQueue = [mockTextModel("What did the bright-light RCT find?")];
    const result = await rewriteQuestion("what about that one?", [
      { role: "user", content: "Tell me about the bright-light RCT" },
      { role: "assistant", content: "It measured sleep onset latency." },
    ]);
    expect(result).toBe("What did the bright-light RCT find?");
  });

  it("falls back to the original question if the rewrite comes back empty", async () => {
    fastQueue = [mockTextModel("   ")];
    const result = await rewriteQuestion("original?", [{ role: "user", content: "prior" }]);
    expect(result).toBe("original?");
  });
});

describe("answerQuestion", () => {
  it("returns the answer with citations verified against the corpus", async () => {
    fastQueue = [routeResponse("single_paper")];
    strongQueue = [
      mockTextModel("Sleep onset latency fell 34% versus placebo [C2]."),
    ];

    const result = await answerQuestion({
      workspaceId: "ws-1",
      question: "What did the RCT find?",
    });

    expect(result.route).toBe("single_paper");
    expect(result.refused).toBe(false);
    expect(result.ungrounded).toBe(false);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.refId).toBe("C2");
    expect(result.citations[0]!.tier).toBe("quote_located");
    expect(result.citations[0]!.page).toBe(5);
    expect(result.citations[0]!.quote).toContain("sleep onset latency");
  });

  // §9.4's refusal path: below the relevance floor, say so rather than
  // confabulating from whatever the excerpts happened to contain.
  it("refuses when the model reports insufficient context", async () => {
    fastQueue = [routeResponse("single_paper")];
    strongQueue = [mockTextModel("INSUFFICIENT_CONTEXT")];

    const result = await answerQuestion({
      workspaceId: "ws-1",
      question: "What is the capital of France?",
    });

    expect(result.refused).toBe(true);
    expect(result.ungrounded).toBe(true);
    expect(result.answer).toBe("The uploaded papers do not cover this.");
    expect(result.citations).toEqual([]);
  });

  it("answers anyway when the caller explicitly opts into ungrounded output", async () => {
    fastQueue = [routeResponse("single_paper")];
    strongQueue = [mockTextModel("INSUFFICIENT_CONTEXT but here is general context.")];

    const result = await answerQuestion({
      workspaceId: "ws-1",
      question: "What is the capital of France?",
      allowUngrounded: true,
    });

    expect(result.refused).toBe(false);
    // No supported citation, so it still renders as ungrounded -- the opt-in
    // changes whether we answer, not whether we claim grounding.
    expect(result.ungrounded).toBe(true);
  });

  // A hallucinated ref has nothing to resolve against, so it must not come
  // back looking like support.
  it("marks an invented citation unsupported instead of trusting it", async () => {
    fastQueue = [routeResponse("single_paper")];
    strongQueue = [mockTextModel("The trial cured everyone [C999].")];

    const result = await answerQuestion({ workspaceId: "ws-1", question: "Did it work?" });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.tier).toBe("unsupported");
    expect(result.citations[0]!.quote).toBeNull();
    expect(result.ungrounded).toBe(true);
  });

  it("flags an uncited answer as ungrounded", async () => {
    fastQueue = [routeResponse("single_paper")];
    strongQueue = [mockTextModel("Bright light probably helps, generally speaking.")];

    const result = await answerQuestion({ workspaceId: "ws-1", question: "Does light help?" });

    expect(result.citations).toEqual([]);
    expect(result.ungrounded).toBe(true);
  });

  // A workspace-level question has nothing to cite by nature, so treating it
  // as a grounding failure would be wrong.
  it("does not flag a meta question as ungrounded for lacking citations", async () => {
    fastQueue = [routeResponse("meta")];
    strongQueue = [mockTextModel("This workspace holds three papers on circadian rhythm.")];

    const result = await answerQuestion({ workspaceId: "ws-1", question: "How many papers?" });

    expect(result.route).toBe("meta");
    expect(result.ungrounded).toBe(false);
  });

  it("rewrites a follow-up before answering, and reports what it asked", async () => {
    fastQueue = [
      mockTextModel("What did the bright-light RCT find?"),
      routeResponse("single_paper"),
    ];
    strongQueue = [mockTextModel("Latency fell 34% [C2].")];

    const result = await answerQuestion({
      workspaceId: "ws-1",
      question: "and that one?",
      history: [{ role: "user", content: "Tell me about the bright-light RCT" }],
    });

    expect(result.standaloneQuestion).toBe("What did the bright-light RCT find?");
  });

  it("verifies every distinct ref in a multi-citation answer", async () => {
    fastQueue = [routeResponse("cross_paper")];
    strongQueue = [mockTextModel("One [C2], another [C5], and a bad one [C999].")];

    const result = await answerQuestion({ workspaceId: "ws-1", question: "Compare them." });

    expect(result.citations.map((c) => c.refId)).toEqual(["C2", "C5", "C999"]);
    expect(result.citations.filter((c) => c.tier === "quote_located")).toHaveLength(2);
    expect(result.citations.filter((c) => c.tier === "unsupported")).toHaveLength(1);
    // One bad citation among good ones must not sink the whole answer.
    expect(result.ungrounded).toBe(false);
  });
});
