import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const backgroundGenerator: GeneratorConfig = {
  name: "background",
  model: fastModel,
  systemPrompt: `Generator: background.

Explain the specific gap, open question, or prior finding this paper positions itself against -- drawn from the source's own introduction/related-work framing, not a generic explanation of the field. State what the source says was unresolved or contested before this work, citing the sentence where the source says so. This is context for why the paper exists, not a restatement of what it found (a separate generator, "summary," covers the findings).`,
};
