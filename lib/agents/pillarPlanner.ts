import "server-only";
import { generateObject } from "ai";
import { strongModel } from "@/lib/ai/client";
import { withObjectRetry } from "@/lib/ai/generateObjectWithRetry";
import { PillarPlanSchema, type PillarPlan } from "@/lib/schemas";
import type { PaperArchetype } from "@/types/anchor";

/**
 * Archetype-conditioned pillar planner (docs/PLAN-V1.md §7 step 2). Strong
 * tier -- this is the plan the whole graph for a paper hangs off of, and the
 * one place "emergent, but bounded" actually gets enforced: unbounded
 * free-form planning collapses into overlapping mush ("Methods" vs
 * "Methodology" vs "Study Design"), a fixed taxonomy collapses into the same
 * failure from the other direction.
 */

export interface PillarPlannerInput {
  paperTitle: string;
  archetype: PaperArchetype;
  hasFigures: boolean;
  hasEquations: boolean;
  /** lib/prompts/contextBlock.ts's output for this paper. */
  contextBlock: string;
}

const SYSTEM_PROMPT = `You are planning the thematic layout ("pillars") of a research-paper breakdown. Rules:

- Pillar and leaf titles must be drawn from THIS paper's own vocabulary, not generic templates. Two pillars must never restate the same concept under different names (e.g. never both "Methods" and "Methodology").
- Skip the "equations" generator entirely if the paper has no equations, and skip "figures" if none are extractable. Never plan a leaf that would have nothing to generate from -- an empty node is worse than no node.
- If archetype is "rct" or "cohort_study", the plan MUST include leaves using the "statistical_validity", "biases", and "clinical_relevance" generators somewhere across the pillars.
- If archetype is "ml_model" or "method_paper", the plan MUST include leaves using "reproducibility", "experimental_design", and "dataset_notes".
- If archetype is "systematic_review", include a pillar whose intent is explicitly comparative (a "Compare" pillar), even though this is a single paper.
- At least one pillar, and at least two leaves overall, MUST use the "custom" generator with a custom_prompt tailored to something specific and unusual about this exact paper. This is a deliberate anti-template forcing function -- a plan with zero custom leaves is an incomplete plan, not a safe default.
- Every leaf needs a one-sentence "rationale" explaining why THIS paper earns that leaf, not why the generator exists in general.
- "reasoning" is shown directly to the reader as "Why this layout?" -- write it for them, not as an internal note to yourself.`;

export async function planPillars(input: PillarPlannerInput): Promise<PillarPlan> {
  const result = await withObjectRetry(() =>
    generateObject({
      model: strongModel(),
      schema: PillarPlanSchema,
      system: SYSTEM_PROMPT,
      prompt: `Paper: ${input.paperTitle}
Archetype: ${input.archetype}
Has extractable figures: ${input.hasFigures}
Has equations: ${input.hasEquations}

Context block:
${input.contextBlock}`,
    }),
  );

  return result.object;
}
