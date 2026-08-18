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
import { equationsGenerator } from "./equations";
import { customGenerator } from "./custom";

export * from "./runGenerator";

/**
 * Registry the pillar planner's leaf.generator values resolve against
 * (docs/PLAN-V1.md §8's generator list; 19 of 22 real types implemented --
 * see lib/agents/orchestrator.ts for how a plan referencing an
 * unimplemented one is handled, which is a real case the fixture/spec both
 * anticipate, not an error). Add a generator by adding one file + one line
 * here, nothing else changes.
 *
 * Deliberately still unimplemented, each for a reason beyond "not built yet":
 * - `figures` needs a vision call against a cropped raster (docs/PLAN-V1.md
 *   §8), and scripts/parse.py doesn't extract figure crops yet. Also needs a
 *   real product/infra decision this file can't make on its own: Groq's
 *   structured-output-capable models (gpt-oss-20b/-120b, CLAUDE.md) are
 *   text-only, and Featherless's vision models (Qwen2.5-VL) returned
 *   `capacity_exhausted` on every attempt when checked live -- neither of
 *   this project's two providers can serve a vision call reliably right
 *   now. Needs a third provider (issue #59 -- Google's Gemini has a real
 *   free tier with genuine multimodal support) and its API key, which this
 *   file can't provision on its own.
 * - `concept_links` (issue #48) turned out to already be solved a different
 *   way, discovered rather than built: lib/services/synthesis.ts's
 *   runSynthesis() already proposes cross-paper `relates` edges (its
 *   PairRelationSchema's "relates" branch -- "same topic, but no direct
 *   agreement, contradiction, extension, or shared method"), backed by the
 *   same two-sided verified evidence every other synthesis edge gets.
 *   Confirmed live against the fixture's 3 real papers, not just by reading
 *   the code: one of the 3 pairs classified as exactly that. A discrete
 *   per-leaf generator was never going to fit this well anyway -- it needs
 *   cross-paper context (other papers' outlines) that GeneratorContext
 *   deliberately doesn't carry (scoped to one paper, same reason chunking
 *   is per-paper), and a body_md+evidence contract has no slot for "also
 *   create this edge." runSynthesis() already is the workspace-level,
 *   cross-paper pass this needs -- concept_links doesn't need its own code
 *   path, just this pointer to the one that already does its job.
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
  equations: equationsGenerator,
  custom: customGenerator,
};
