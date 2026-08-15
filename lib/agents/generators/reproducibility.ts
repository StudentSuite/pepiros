import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const reproducibilityGenerator: GeneratorConfig = {
  name: "reproducibility",
  model: fastModel,
  systemPrompt: `Generator: reproducibility.

State what this paper actually makes available for someone trying to reproduce it -- code, data, pre-registration, materials, exact parameter/hyperparameter settings -- and what it does not. Base this only on what the source explicitly states was released or withheld (e.g. "code available at [repo]", "data available on request", no mention of either). Do not guess at availability the source doesn't state. If nothing is said about reproducibility materials, say that plainly rather than assuming either way.`,
};
