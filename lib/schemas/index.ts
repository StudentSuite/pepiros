import { z } from "zod";
import { PAPER_ARCHETYPES } from "@/types/anchor";

/**
 * Zod schemas shared by lib/agents/*, app/api/*, mcp/*, and (eventually) the
 * UI -- single source of truth for the shapes an LLM call must produce.
 * Every LLM output in this codebase is zod-validated (docs/PLAN-V1.md §3.1);
 * nothing here is optional decoration.
 */

export const ArchetypeSchema = z.enum(PAPER_ARCHETYPES);

/**
 * The 21 node generators (docs/PLAN-V1.md §8). `custom` is the anti-template
 * forcing function the pillar planner must use at least once per paper.
 */
export const GENERATOR_NAMES = [
  "summary",
  "contributions",
  "background",
  "jargon",
  "methodology",
  "experimental_design",
  "statistical_validity",
  "biases",
  "weaknesses",
  "stated_limitations",
  "novelty",
  "reproducibility",
  "dataset_notes",
  "ethics",
  "clinical_relevance",
  "future_work",
  "equations",
  "figures",
  "does_not_establish",
  "concept_links",
  "flashcards",
  "quiz",
  "custom",
] as const;

export const GeneratorNameSchema = z.enum(GENERATOR_NAMES);
export type GeneratorName = z.infer<typeof GeneratorNameSchema>;

/** Archetype classifier output (docs/PLAN-V1.md §7 step 1). */
export const ArchetypeClassificationSchema = z.object({
  archetype: ArchetypeSchema,
});
export type ArchetypeClassification = z.infer<typeof ArchetypeClassificationSchema>;

/** Archetype-conditioned pillar/leaf plan (docs/PLAN-V1.md §7 step 2, verbatim shape). */
export const PillarPlanSchema = z.object({
  archetype: ArchetypeSchema,
  reasoning: z.string(),
  pillars: z
    .array(
      z.object({
        key: z.string(),
        title: z.string().max(22),
        intent: z.string(),
        priority: z.number().int(),
        leaves: z
          .array(
            z.object({
              key: z.string(),
              title: z.string().max(26),
              generator: GeneratorNameSchema,
              rationale: z.string(),
              custom_prompt: z.string().optional(),
            }),
          )
          .min(3)
          .max(9),
      }),
    )
    .min(3)
    .max(6),
});
export type PillarPlan = z.infer<typeof PillarPlanSchema>;

/**
 * Uniform generator output contract (docs/PLAN-V1.md §8). `evidence[].refs`
 * is an array per claim -- multi-span/multi-ref claims are required, not
 * optional (plan.md §4's aggregate-claim case), so a claim citing three
 * chunks is `{ refs: ["C4","C5","C6"], quote }`, not three separate claims.
 * `body_md` MUST contain a `[^eN]` marker for every entry in `evidence` --
 * enforced by the caller (lib/agents/generators/runGenerator.ts), not by this
 * schema, since the marker ids are assigned after the model responds.
 */
export const GeneratorEvidenceClaimSchema = z.object({
  refs: z.array(z.string()).min(1),
  quote: z.string(),
});

export const GeneratorOutputSchema = z.object({
  title: z.string(),
  body_md: z.string(),
  evidence: z.array(GeneratorEvidenceClaimSchema),
  confidence: z.enum(["high", "medium", "low"]),
  followups: z.array(z.string()).max(4),
});
export type GeneratorOutput = z.infer<typeof GeneratorOutputSchema>;
