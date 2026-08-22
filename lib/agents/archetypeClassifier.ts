import "server-only";
import { generateObject } from "ai";
import { fastModel } from "@/lib/ai/client";
import { withObjectRetry } from "@/lib/ai/generateObjectWithRetry";
import { PAPER_ARCHETYPES, type PaperArchetype } from "@/types/anchor";

/**
 * Verified live: when this falls over to Featherless (an OpenAI-compatible
 * provider with no native "enum output" mode, unlike Groq), the model
 * returns `{"archetype": "case_report"}` instead of the `{"result":
 * "case_report"}` shape the AI SDK's enum validator requires -- the right
 * value, wrapped under the wrong key, because Featherless's structured-
 * output path doesn't share Groq's enum handling. Every retry hits the
 * same shape from the same provider, so resampling alone never fixes it;
 * this repairs the key name when the value is otherwise a valid archetype.
 */
function repairEnumKey(text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const values = Object.values(parsed as Record<string, unknown>);
  const value = values.find((v): v is PaperArchetype => (PAPER_ARCHETYPES as readonly string[]).includes(v as string));
  return value ? JSON.stringify({ result: value }) : null;
}

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
      // See pillarPlanner.ts's identical guard: bounds each attempt so a
      // slow fallback provider fails fast instead of hanging.
      abortSignal: AbortSignal.timeout(45_000),
      experimental_repairText: async ({ text }) => repairEnumKey(text),
    }),
  );

  return result.object;
}
