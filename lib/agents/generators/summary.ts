import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const summaryGenerator: GeneratorConfig = {
  name: "summary",
  model: fastModel,
  systemPrompt: `Generator: summary.

Write a concise, evidence-backed summary of what this paper actually did and found -- not the abstract restated, the reader's first real content (docs/PLAN-V1.md §1's pacing: this is often the first thing a reader sees). Lead with the primary result, not the background. Every quantitative claim needs a citation to the specific chunk or numeric it came from.`,
};
