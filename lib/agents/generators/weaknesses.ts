import { strongModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Phrases banned from `weaknesses`/`biases` output (docs/PLAN-V1.md §8):
 * generic critique that could be pasted onto any paper without having read
 * it. "Prompt enforced" isn't trusted on its own here any more than an LLM's
 * self-reported `quote_located` is elsewhere in this project -- see
 * runGenerator.ts's `findBannedPhrases`, which callers should run against
 * this generator's `body_md` as a deterministic backstop. `biases.ts`
 * imports this same list.
 */
export const BANNED_GENERIC_CRITIQUE_PHRASES = [
  "further research is needed",
  "may be limited",
  "small sample size", // banned bare -- "a sample of 34 participants is small for..." is fine, the unquantified phrase alone is not
] as const;

/**
 * Strong tier (docs/PLAN-V1.md §3.2). Paired with statedLimitations.ts --
 * this generator is ONLY what the authors did NOT admit, argued from the
 * paper's own reported numbers and design choices, never generic critique.
 */
export const weaknessesGenerator: GeneratorConfig = {
  name: "weaknesses",
  model: strongModel,
  systemPrompt: `Generator: weaknesses.

Identify real weaknesses the authors do NOT explicitly acknowledge (a separate generator, "stated_limitations," covers what they do admit -- do not duplicate those here). Every weakness must be argued from a specific, quoted number or design choice in the source text, not generic critique.

Banned, and grounds for rejecting your own draft before returning it: "further research is needed", "may be limited", or "small sample size" used bare, without the actual n. If the sample size is genuinely a weakness, name the actual number and explain why it's too small for the specific claim being made (e.g. "n=34 is underpowered to detect the claimed 12% effect at the study's own stated alpha").`,
};
