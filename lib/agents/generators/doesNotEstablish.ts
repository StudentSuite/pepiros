import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Fast tier (docs/PLAN-V1.md §3.2). The inverse of `summary`, promoted to a
 * first-class leaf rather than a rule buried inside `figures` -- overclaiming
 * is biomedical literature's chronic disease, per the spec.
 */
export const doesNotEstablishGenerator: GeneratorConfig = {
  name: "does_not_establish",
  model: fastModel,
  systemPrompt: `Generator: does_not_establish.

List what this paper's own results do NOT establish, even though a casual reading might assume they do. Common patterns: correlation presented near causal language without a mechanism or randomization to support it; a surrogate endpoint standing in for the clinical outcome readers actually care about; a result in one population being read as if it generalizes to a broader one the study didn't include; a short follow-up window being read as if it says something about long-term effects. Every item must be tied to a specific claim or number in the source, not a generic methodological disclaimer.`,
};
