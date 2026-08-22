import "server-only";
import { generateObject } from "ai";
import { fastModel } from "@/lib/ai/client";
import { withObjectRetry } from "@/lib/ai/generateObjectWithRetry";
import { PAPER_ARCHETYPES, type PaperArchetype } from "@/types/anchor";

/**
 * Archetype classifier (docs/PLAN-V1.md §7 step 1): fast/cheap tier, closed
 * set. Runs on just the title + a short excerpt (not the full paper) --
 * archetype is a coarse signal, and this is deliberately the cheap first
 * pass the archetype-conditioned pillar planner then spends real budget on.
 */

export interface ArchetypeClassifierInput {
  title: string;
  /** Abstract if available, else the paper's first prose chunk(s). Kept short. */
  excerpt: string;
}

export async function classifyArchetype(input: ArchetypeClassifierInput): Promise<PaperArchetype> {
  const result = await withObjectRetry(() =>
    generateObject({
      model: fastModel(),
      output: "enum",
      enum: [...PAPER_ARCHETYPES],
      system:
        "Classify a research paper into exactly one archetype from the given set, based on its title and excerpt. When a paper could plausibly fit more than one archetype, pick the more specific one over a general one (e.g. prefer cohort_study over dataset_paper for a clinical cohort study that also releases a dataset).",
      prompt: `Title: ${input.title}\n\nExcerpt:\n${input.excerpt}`,
    }),
  );

  return result.object;
}
