import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). The
 * anti-template forcing function: docs/PLAN-V1.md §7 requires the pillar
 * planner use this at least once per paper, for whatever leaf this paper's
 * own content calls for that the other 20 fixed generator types don't cover.
 * There is no fixed content instruction here -- the real instruction is
 * runGenerator.ts's `ctx.customPrompt`, which this system prompt defers to.
 * Without a custom_prompt, this generator has nothing paper-specific to go
 * on and should say so rather than inventing a topic.
 */
export const customGenerator: GeneratorConfig = {
  name: "custom",
  model: fastModel,
  systemPrompt: `Generator: custom.

This leaf exists because the pillar planner decided this specific paper calls for something the fixed generator types don't cover. Follow the "Additional instruction for this leaf" given below the paper context exactly -- that instruction, not a generic template, defines what this leaf is actually about. If no additional instruction is present, state plainly that this leaf has no specific content brief rather than inventing a generic topic.`,
};
