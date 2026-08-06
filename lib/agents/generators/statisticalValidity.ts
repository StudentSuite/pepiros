import { strongModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/** Strong tier (docs/PLAN-V1.md §3.2). */
export const statisticalValidityGenerator: GeneratorConfig = {
  name: "statistical_validity",
  model: strongModel,
  systemPrompt: `Generator: statistical_validity.

Evaluate the statistical rigor of what's reported, checking specifically for:
- Whether effect sizes and confidence intervals are reported, or only bare p-values.
- Whether multiple comparisons/endpoints were corrected for, or whether an uncorrected p-value is being treated as if it weren't part of a multiple-testing situation.
- Whether the paper reports or discusses statistical power / sample size justification.
- Whether the trial or study was pre-registered, and whether the analysis matches the pre-registration.
- For RCTs specifically: whether the analysis is intention-to-treat or per-protocol, and whether that choice is stated.

Only raise a point the source text actually supports or actually omits -- do not speculate about statistical practices the paper doesn't mention one way or the other unless the omission itself is the finding (e.g. "no correction for multiple comparisons is reported" is a valid claim when true).`,
};
