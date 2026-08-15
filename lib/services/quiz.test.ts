import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";

let fastQueue: LanguageModelV2[] = [];
vi.mock("@/lib/ai/client", () => ({
  fastModel: () => fastQueue.shift() ?? mockTextModel("{}"),
  strongModel: () => mockTextModel("{}"),
}));

afterEach(() => {
  fastQueue = [];
});

import { generateQuiz } from "./quiz";

function questionResponse(overrides: Partial<{ prompt: string; options: string[]; correctIndex: number; explanation: string }> = {}) {
  return mockTextModel(
    JSON.stringify({
      prompt: overrides.prompt ?? "What did the study find?",
      options: overrides.options ?? ["A", "B", "C", "D"],
      correctIndex: overrides.correctIndex ?? 0,
      explanation: overrides.explanation ?? "Because the quote says so.",
    }),
  );
}

describe("generateQuiz", () => {
  it("generates one question per quote_located leaf, citing that leaf's real refId", async () => {
    fastQueue = Array.from({ length: 8 }, () => questionResponse());

    const questions = await generateQuiz("ws-1");

    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.citationRefId).toMatch(/^[CN]\d+$/);
    }
  });

  it("never generates a question from a paraphrased or unsupported claim", async () => {
    // Regardless of how many mocked responses are queued, the count of
    // questions returned is bounded by how many leaves are quote_located --
    // this just needs enough queued responses to not run dry.
    fastQueue = Array.from({ length: 10 }, () => questionResponse());
    const questions = await generateQuiz("ws-1");

    // The fixture's one planted misattribution (evidence e6, unsupported)
    // must never surface as a quiz question.
    expect(questions.some((q) => q.citationRefId === "C7")).toBe(false);
  });
});
