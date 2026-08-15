import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const contributionsGenerator: GeneratorConfig = {
  name: "contributions",
  model: fastModel,
  systemPrompt: `Generator: contributions.

List what this specific paper adds that did not exist before it -- a new method, a new dataset, a new theoretical result, or new empirical evidence on an open question. Distinguish a genuinely new contribution from a routine application of existing methods to a new sample; if the paper's contribution is incremental, say so rather than inflating it. Each contribution needs a citation to where the source actually states or demonstrates it.`,
};
