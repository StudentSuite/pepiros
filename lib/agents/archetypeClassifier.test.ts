import { describe, expect, it, vi } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
import { classifyArchetype } from "./archetypeClassifier";

// generateObject's `output: "enum"` mode wraps the expected value as
// `{ result: <value> }` internally (confirmed empirically -- not documented
// in the type signature), not a bare JSON string.
function enumResponse(value: string) {
  return mockTextModel(JSON.stringify({ result: value }));
}

let nextModel: LanguageModelV2 = enumResponse("rct");

vi.mock("@/lib/ai/client", () => ({
  fastModel: () => nextModel,
  strongModel: () => nextModel,
}));

describe("classifyArchetype", () => {
  it("returns the model's chosen archetype", async () => {
    nextModel = enumResponse("cohort_study");
    const result = await classifyArchetype({
      title: "A Cohort Study of Something",
      excerpt: "212 participants followed for six months.",
    });
    expect(result).toBe("cohort_study");
  });

  it("passes title and excerpt into the prompt sent to the model", async () => {
    const mock = enumResponse("rct") as LanguageModelV2 & { _calls: Array<{ prompt: unknown }> };
    nextModel = mock;

    await classifyArchetype({ title: "My Paper Title", excerpt: "Some excerpt text." });

    const call = mock._calls.at(-1)!;
    const promptText = JSON.stringify(call.prompt);
    expect(promptText).toContain("My Paper Title");
    expect(promptText).toContain("Some excerpt text.");
  });
});
