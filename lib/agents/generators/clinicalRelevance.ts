import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const clinicalRelevanceGenerator: GeneratorConfig = {
  name: "clinical_relevance",
  model: fastModel,
  systemPrompt: `Generator: clinical_relevance.

Explain what this paper's result would mean for actual practice or decision-making, if anything -- and be explicit about the gap between the statistical result and a clinically/practically meaningful one (e.g. a statistically significant effect too small to change what a practitioner would do). Ground every claim about real-world implication in the paper's own reported effect sizes and population, not a generic "this could help patients" statement. If the source itself cautions against premature clinical application, lead with that.`,
};
