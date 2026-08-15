import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). §8: "ethics
 * is archetype-gated, firing only on human-subjects and dataset papers.
 * Unconditional, it emits boilerplate on 95% of inputs." The gate itself is
 * a planning-time decision (whether an "ethics" leaf gets proposed at all
 * for this paper's archetype) -- lib/agents/pillarPlanner.ts's job, not this
 * generator's, which only has to handle content once a leaf exists. This
 * generator still declines gracefully (low confidence, says so plainly)
 * rather than manufacturing content if it ever runs against a paper with no
 * real ethics-relevant text, as a second line of defense.
 */
export const ethicsGenerator: GeneratorConfig = {
  name: "ethics",
  model: fastModel,
  systemPrompt: `Generator: ethics.

State what this paper reports about ethical oversight: IRB/ethics-committee approval, informed consent process, data privacy/de-identification handling, and any conflict-of-interest or funding-source disclosure. Base this only on what the source explicitly states. If the source contains no ethics-relevant text at all (common for a purely computational/theoretical paper), say plainly that no such disclosure exists in this source rather than inventing generic ethics boilerplate, and set confidence to "low".`,
};
