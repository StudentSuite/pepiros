import { describe, expect, it, vi } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
import { planPillars } from "./pillarPlanner";

const VALID_PLAN = {
  archetype: "rct",
  reasoning: "This RCT is organized around its randomization design and primary endpoint.",
  pillars: [
    {
      key: "methods",
      title: "Methods",
      intent: "How the trial was run",
      priority: 1,
      leaves: [
        { key: "l1", title: "Randomization", generator: "methodology", rationale: "core design fact" },
        { key: "l2", title: "Sample", generator: "statistical_validity", rationale: "n and power" },
        { key: "l3", title: "Custom quirk", generator: "custom", rationale: "unusual protocol detail", custom_prompt: "explain the unusual crossover window" },
      ],
    },
    {
      key: "findings",
      title: "Findings",
      intent: "What was found",
      priority: 2,
      leaves: [
        { key: "l4", title: "Primary result", generator: "summary", rationale: "headline finding" },
        { key: "l5", title: "Biases", generator: "biases", rationale: "risk of bias" },
        { key: "l6", title: "Another custom", generator: "custom", rationale: "paper-specific angle", custom_prompt: "cover the odd secondary outcome" },
      ],
    },
    {
      key: "limits",
      title: "Limits",
      intent: "What the paper does and doesn't show",
      priority: 3,
      leaves: [
        { key: "l7", title: "Stated limits", generator: "stated_limitations", rationale: "author-admitted" },
        { key: "l8", title: "Weaknesses", generator: "weaknesses", rationale: "unstated issues" },
        { key: "l9", title: "Overclaiming", generator: "does_not_establish", rationale: "guard rail" },
      ],
    },
  ],
};

let nextModel: LanguageModelV2 = mockTextModel(JSON.stringify(VALID_PLAN));

vi.mock("@/lib/ai/client", () => ({
  fastModel: () => nextModel,
  strongModel: () => nextModel,
}));

describe("planPillars", () => {
  it("returns a schema-validated pillar plan", async () => {
    nextModel = mockTextModel(JSON.stringify(VALID_PLAN));
    const result = await planPillars({
      paperTitle: "Test RCT",
      archetype: "rct",
      hasFigures: false,
      hasEquations: false,
      contextBlock: "[C1 | Methods | p.1] some text",
    });

    expect(result.pillars).toHaveLength(3);
    expect(result.pillars[0]!.leaves).toHaveLength(3);
    expect(result.reasoning).toBe(VALID_PLAN.reasoning);
  });

  it("rejects a plan violating the schema (pillar title too long)", async () => {
    const invalidPlan = {
      ...VALID_PLAN,
      pillars: [
        { ...VALID_PLAN.pillars[0]!, title: "This Pillar Title Is Way Too Long For The Canvas Budget" },
      ],
    };
    nextModel = mockTextModel(JSON.stringify(invalidPlan));

    await expect(
      planPillars({
        paperTitle: "Test RCT",
        archetype: "rct",
        hasFigures: false,
        hasEquations: false,
        contextBlock: "[C1 | Methods | p.1] some text",
      }),
    ).rejects.toThrow();
  });

  it("includes the context block and figure/equation flags in the prompt", async () => {
    const mock = mockTextModel(JSON.stringify(VALID_PLAN)) as LanguageModelV2 & {
      _calls: Array<{ prompt: unknown }>;
    };
    nextModel = mock;

    await planPillars({
      paperTitle: "Test RCT",
      archetype: "rct",
      hasFigures: true,
      hasEquations: false,
      contextBlock: "[C1 | Methods | p.1] a very specific sentence",
    });

    const promptText = JSON.stringify(mock._calls.at(-1)!.prompt);
    expect(promptText).toContain("a very specific sentence");
    expect(promptText).toContain("Has extractable figures: true");
  });
});
