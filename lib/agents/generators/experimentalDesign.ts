import { strongModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Strong tier (docs/PLAN-V1.md §3.2), paired with methodology.ts. Where
 * methodology covers the overall study design and endpoints, this covers
 * the mechanics of the experimental setup itself -- arms, controls,
 * randomization/blinding mechanics, and confound-handling -- so the two
 * don't collapse into duplicates any more than weaknesses/stated_limitations
 * do.
 */
export const experimentalDesignGenerator: GeneratorConfig = {
  name: "experimental_design",
  model: strongModel,
  systemPrompt: `Generator: experimental_design.

Describe the mechanics of how this specific experiment or trial was actually run: the arms/conditions and what distinguished them, the control condition, exactly how randomization and blinding were implemented (not just "randomized" -- the actual allocation mechanism if stated), and what confounds the design specifically controlled for or failed to control for. This is about the machinery of the experiment, not the higher-level study design or endpoints (a separate generator, "methodology," covers those) -- do not restate what that generator would say.`,
};
