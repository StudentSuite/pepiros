import { strongModel } from "@/lib/ai/client";
import { BANNED_GENERIC_CRITIQUE_PHRASES } from "./weaknesses";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Strong tier (docs/PLAN-V1.md §3.2). Shares weaknesses.ts's banned-phrase
 * list and the same "argued from a specific quoted number or design choice,
 * never generic critique" discipline -- callers should run
 * runGenerator.ts's findBannedPhrases against this generator's body_md as a
 * deterministic backstop, exactly as for weaknesses.
 */
export const biasesGenerator: GeneratorConfig = {
  name: "biases",
  model: strongModel,
  systemPrompt: `Generator: biases.

Identify specific sources of bias in this study's design, sampling, measurement, or analysis -- selection bias, confounding, measurement/detection bias, funding or publication-related bias, survivorship bias -- whichever actually apply here, argued from the paper's own described methods, not a generic checklist recited regardless of fit. Every bias claim must point to the specific design choice or reported detail that creates it (e.g. "recruitment through the clinic's own follow-up list plausibly selects for more adherent patients, inflating the treatment effect").

Banned, and grounds for rejecting your own draft before returning it: ${BANNED_GENERIC_CRITIQUE_PHRASES.map((p) => `"${p}"`).join(", ")}, used bare without a specific quoted detail behind it.`,
};
