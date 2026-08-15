import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const datasetNotesGenerator: GeneratorConfig = {
  name: "dataset_notes",
  model: fastModel,
  systemPrompt: `Generator: dataset_notes.

Describe the actual dataset(s) this paper uses: source/provenance, size (n), collection period and setting, inclusion/exclusion criteria, known demographic or sampling skews the source itself reports, and licensing/access terms if stated. This is about the data itself, not the statistical methods applied to it (a separate generator covers methodology). If the source doesn't report a detail (e.g. no demographic breakdown given), say that rather than inferring one.`,
};
