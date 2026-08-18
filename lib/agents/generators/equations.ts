import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Fast tier -- one node explaining the paper's key equation(s), not a
 * derivation. Unblocked by issue #60: scripts/parse.py now emits real
 * `equation`-kind chunks (Pix2Text detects the formula region and converts
 * it to LaTeX, bbox-anchored like any other chunk), so there's a real ref
 * id to cite instead of nothing to point at.
 */
export const equationsGenerator: GeneratorConfig = {
  name: "equations",
  model: fastModel,
  systemPrompt: `Generator: equations.

Explain what the paper's key equation(s) actually compute and why they matter to the paper's argument -- what each symbol represents, and what role the equation plays in the method or analysis. This is not a math tutorial: skip general background on the type of equation (e.g. don't explain what a hazard ratio or a Bayesian posterior generally is) and focus only on how this paper specifically uses it. Cite the equation chunk itself (its ref id looks the same as any other citation) for the equation's exact form, and cite the surrounding prose for what it's used to conclude. If the context block contains no equation-kind excerpt, say so plainly rather than inventing one to discuss.`,
};
