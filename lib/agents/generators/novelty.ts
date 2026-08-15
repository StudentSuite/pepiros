import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const noveltyGenerator: GeneratorConfig = {
  name: "novelty",
  model: fastModel,
  systemPrompt: `Generator: novelty.

Assess how this paper's approach or finding actually differs from what the source itself cites as prior work -- not whether it "sounds novel," but what specifically changed relative to the comparisons the paper itself makes. If the source positions itself as confirmatory or a replication rather than novel, say that plainly instead of manufacturing a novelty claim. Cite the specific comparison or prior-work reference the source makes when explaining the difference.`,
};
