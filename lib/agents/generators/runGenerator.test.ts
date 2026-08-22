import { describe, expect, it } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { mockTextModel } from "@/lib/testing/mockLanguageModel";
import { bindEvidenceMarkers, findBannedPhrases, runGenerator, type GeneratorConfig } from "./runGenerator";

const VALID_OUTPUT = {
  title: "Randomization protocol",
  body_md: "Participants were randomized 1:1. [^n0]",
  evidence: [{ refs: ["C1"], quote: "Participants were randomized 1:1 to receive..." }],
  confidence: "high",
  followups: ["How was blinding maintained?"],
};

describe("runGenerator", () => {
  it("returns a schema-validated GeneratorOutput and includes the paper context in the prompt", async () => {
    const mock = mockTextModel(JSON.stringify(VALID_OUTPUT)) as LanguageModelV2 & {
      _calls: Array<{ prompt: unknown }>;
    };
    const config: GeneratorConfig = {
      name: "methodology",
      model: () => mock,
      systemPrompt: "Generator: methodology.",
    };

    const output = await runGenerator(config, {
      paperTitle: "Test Paper",
      archetype: "rct",
      contextBlock: "[C1 | Methods | p.1] Participants were randomized 1:1 to receive...",
      customPrompt: "focus on the crossover design",
    });

    expect(output).toEqual(VALID_OUTPUT);

    const call = mock._calls.at(-1)!;
    const promptText = JSON.stringify(call.prompt);
    expect(promptText).toContain("Test Paper");
    expect(promptText).toContain("focus on the crossover design");
    expect(promptText).toContain("Generator: methodology.");
    expect(promptText).toContain("Only cite ids that appear in the context block");
  });

  it("recovers a real-observed markdown-fenced response (visionModel()'s free OpenRouter model, issue #59)", async () => {
    const mock = mockTextModel("```json\n" + JSON.stringify(VALID_OUTPUT) + "\n```");
    const config: GeneratorConfig = { name: "figures", model: () => mock, systemPrompt: "Generator: figures." };

    const output = await runGenerator(config, {
      paperTitle: "Test Paper",
      archetype: "ml_model",
      contextBlock: "[C1 | Methods | p.1] Participants were randomized 1:1 to receive...",
    });

    expect(output).toEqual(VALID_OUTPUT);
  });

  it("rejects an output with an invalid (not merely missing) field value", async () => {
    const invalid = { ...VALID_OUTPUT, confidence: "very high" };
    const mock = mockTextModel(JSON.stringify(invalid));
    const config: GeneratorConfig = { name: "methodology", model: () => mock, systemPrompt: "x" };

    await expect(
      runGenerator(config, { paperTitle: "T", archetype: "rct", contextBlock: "ctx" }),
    ).rejects.toThrow();
  });

  // Observed live: Featherless's fast-tier fallback (Qwen2.5-7B-Instruct)
  // returned only body_md, omitting title/confidence/followups entirely --
  // a genuinely incomplete object, not malformed JSON.
  it("backfills title/confidence/followups when a real response omits them entirely", async () => {
    const incomplete = { body_md: "The variant is pathogenic. [^n0]", evidence: [{ refs: ["C1"], quote: "pathogenic" }] };
    const mock = mockTextModel(JSON.stringify(incomplete));
    const config: GeneratorConfig = { name: "summary", model: () => mock, systemPrompt: "x" };

    const output = await runGenerator(config, { paperTitle: "T", archetype: "case_report", contextBlock: "ctx" });

    expect(output.body_md).toBe("The variant is pathogenic. [^n0]");
    expect(output.evidence).toEqual([{ refs: ["C1"], quote: "pathogenic" }]);
    expect(output.confidence).toBe("medium");
    expect(output.followups).toEqual([]);
    expect(output.title.length).toBeGreaterThan(0);
  });
});

describe("bindEvidenceMarkers", () => {
  it("replaces each notional marker with its assigned replacement", () => {
    const bound = bindEvidenceMarkers("A[^n0] and B[^n1].", ["[^e1]", "[^e2][^e3]"]);
    expect(bound).toBe("A[^e1] and B[^e2][^e3].");
  });

  it("leaves unmatched notional markers alone", () => {
    const bound = bindEvidenceMarkers("A[^n0] and B[^n5].", ["[^e1]"]);
    expect(bound).toBe("A[^e1] and B[^n5].");
  });

  it("also binds a bracket/caret-swapped marker (observed live from a real Groq call)", () => {
    const bound = bindEvidenceMarkers("No test name appears here.^[n0]", ["[^e2]"]);
    expect(bound).toBe("No test name appears here.[^e2]");
    expect(bound).not.toContain("^[n0]");
  });
});

describe("findBannedPhrases", () => {
  it("finds a banned phrase regardless of case", () => {
    expect(findBannedPhrases("Further Research Is Needed here.", ["further research is needed"])).toEqual([
      "further research is needed",
    ]);
  });

  it("returns an empty array when nothing banned is present", () => {
    expect(findBannedPhrases("n=34 is underpowered for the claimed effect.", ["small sample size"])).toEqual([]);
  });
});
