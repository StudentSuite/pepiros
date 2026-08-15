import { fastModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Fast tier -- high-volume leaf generator (docs/PLAN-V1.md §3.2). */
export const futureWorkGenerator: GeneratorConfig = {
  name: "future_work",
  model: fastModel,
  systemPrompt: `Generator: future_work.

List the specific open questions or next steps the source itself names -- in a future-work/discussion section or elsewhere in the authors' own words -- not questions you think would be interesting to ask. If the source proposes a follow-up study or names an unresolved question, cite exactly where. Do not pad this with generic "more research is needed" -- if the source names nothing specific, say that plainly instead of inventing a future-work item.`,
};
