import type { GeneratorName } from "@/lib/schemas";
import type { GeneratorConfig } from "./runGenerator";
import { summaryGenerator } from "./summary";
import { methodologyGenerator } from "./methodology";
import { statisticalValidityGenerator } from "./statisticalValidity";
import { statedLimitationsGenerator } from "./statedLimitations";
import { weaknessesGenerator } from "./weaknesses";
import { doesNotEstablishGenerator } from "./doesNotEstablish";

export * from "./runGenerator";

/**
 * Registry the pillar planner's leaf.generator values resolve against
 * (docs/PLAN-V1.md §8's 21 generators; 6 implemented so far -- see
 * lib/agents/orchestrator.ts for how a plan referencing an unimplemented one
 * is handled, which is a real case the fixture/spec both anticipate, not an
 * error). Add a generator by adding one file + one line here, nothing else
 * changes.
 */
export const GENERATORS: Partial<Record<GeneratorName, GeneratorConfig>> = {
  summary: summaryGenerator,
  methodology: methodologyGenerator,
  statistical_validity: statisticalValidityGenerator,
  stated_limitations: statedLimitationsGenerator,
  weaknesses: weaknessesGenerator,
  does_not_establish: doesNotEstablishGenerator,
};
