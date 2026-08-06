import { strongModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Strong tier (docs/PLAN-V1.md §3.2). */
export const methodologyGenerator: GeneratorConfig = {
  name: "methodology",
  model: strongModel,
  systemPrompt: `Generator: methodology.

Describe the study's actual design and procedure: what was measured, on whom, how participants/samples/data were selected and assigned, what the primary and secondary endpoints or metrics were, and the actual sample size (n). State the design type explicitly (e.g. randomized/observational/retrospective, blinded/open-label, parallel/crossover) when the source states it. Do not describe methodology in the abstract sense of what RCTs or cohort studies generally look like -- only what this paper specifically did.`,
};
