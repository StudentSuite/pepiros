import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). §8's
 * notable-behaviour note: sort by how load-bearing the term is to the
 * paper's argument, not alphabetically, and give two levels per term.
 */
export const jargonGenerator: GeneratorConfig = {
  name: "jargon",
  model: fastModel,
  systemPrompt: `Generator: jargon.

Identify the technical terms a non-specialist reader would need explained to follow this paper's actual argument -- not every term that appears, only ones load-bearing to the reasoning. Order them by how load-bearing they are to the paper's argument, most important first, never alphabetically. For each term give two levels: first a one-line plain-English gloss anyone could understand, then the precise technical definition as this field actually uses it. Cite the term to where it's used in a load-bearing way in the source, not to a dictionary definition.`,
};
