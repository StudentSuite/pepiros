import type { GeneratorName } from "@/lib/schemas";
import type { GeneratorConfig } from "./runGenerator";
import { summaryGenerator } from "./summary";
import { methodologyGenerator } from "./methodology";
import { statisticalValidityGenerator } from "./statisticalValidity";
import { statedLimitationsGenerator } from "./statedLimitations";
import { weaknessesGenerator } from "./weaknesses";
import { doesNotEstablishGenerator } from "./doesNotEstablish";
import { contributionsGenerator } from "./contributions";
import { backgroundGenerator } from "./background";
import { jargonGenerator } from "./jargon";
import { biasesGenerator } from "./biases";
import { noveltyGenerator } from "./novelty";
import { reproducibilityGenerator } from "./reproducibility";
import { datasetNotesGenerator } from "./datasetNotes";
import { ethicsGenerator } from "./ethics";
import { clinicalRelevanceGenerator } from "./clinicalRelevance";
import { futureWorkGenerator } from "./futureWork";
import { experimentalDesignGenerator } from "./experimentalDesign";
import { customGenerator } from "./custom";

export * from "./runGenerator";

/**
 * Registry the pillar planner's leaf.generator values resolve against
 * (docs/PLAN-V1.md §8's generator list; 18 of 22 real types implemented --
 * see lib/agents/orchestrator.ts for how a plan referencing an
 * unimplemented one is handled, which is a real case the fixture/spec both
 * anticipate, not an error). Add a generator by adding one file + one line
 * here, nothing else changes.
 *
 * Deliberately still unimplemented, each for a reason beyond "not built yet":
 * - `figures` needs a vision call against a cropped raster (docs/PLAN-V1.md
 *   §8), and scripts/parse.py doesn't extract figure crops yet.
 * - `equations` needs equation-kind chunks with bbox anchoring; parse.py
 *   only emits `kind: "prose"` today.
 * - `concept_links` needs cross-paper context (other papers' outlines) that
 *   GeneratorContext doesn't carry -- it's scoped to one paper by design,
 *   same reason chunking is per-paper. Proposing real `relates` edges from
 *   a generator's output also doesn't fit the uniform body_md+evidence
 *   contract the way this file's other generators do.
 * - `quiz`/`flashcards` are real, but solved a different way:
 *   lib/services/quiz.ts derives quiz questions from leaves that already
 *   have quote_located evidence, and components/learn/FlashcardDeck.tsx
 *   derives flashcards from leaf nodes at render time. Neither needs its
 *   own node in the graph.
 */
export const GENERATORS: Partial<Record<GeneratorName, GeneratorConfig>> = {
  summary: summaryGenerator,
  methodology: methodologyGenerator,
  experimental_design: experimentalDesignGenerator,
  statistical_validity: statisticalValidityGenerator,
  stated_limitations: statedLimitationsGenerator,
  weaknesses: weaknessesGenerator,
  biases: biasesGenerator,
  does_not_establish: doesNotEstablishGenerator,
  contributions: contributionsGenerator,
  background: backgroundGenerator,
  jargon: jargonGenerator,
  novelty: noveltyGenerator,
  reproducibility: reproducibilityGenerator,
  dataset_notes: datasetNotesGenerator,
  ethics: ethicsGenerator,
  clinical_relevance: clinicalRelevanceGenerator,
  future_work: futureWorkGenerator,
  custom: customGenerator,
};
