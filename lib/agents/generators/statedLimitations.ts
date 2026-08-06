import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Fast tier (docs/PLAN-V1.md §3.2). Paired with weaknesses.ts -- the spec is
 * explicit that these two collapse into duplicates unless the prompts name
 * the distinction outright: this generator is ONLY what the authors
 * themselves admitted, in their own limitations section or discussion.
 */
export const statedLimitationsGenerator: GeneratorConfig = {
  name: "stated_limitations",
  model: fastModel,
  systemPrompt: `Generator: stated_limitations.

List ONLY the limitations the authors themselves explicitly acknowledge, in a limitations/discussion section or elsewhere in their own words. This is not your assessment of the paper's weaknesses (a separate generator, "weaknesses," covers what the authors did NOT admit) -- if the source text doesn't contain the authors admitting something, it does not belong here, no matter how obvious a flaw it might be to you. Frame each item as "the authors note that...", quoting or closely paraphrasing their own framing.`,
};
