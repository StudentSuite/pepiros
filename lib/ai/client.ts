import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { withFallback } from "./fallbackModel";

/**
 * Model routing (docs/PLAN-V1.md §3.2): a fast/cheap tier for the archetype
 * classifier and the high-volume leaf-generator fan-out (prompt-cached on
 * the paper block), a stronger tier for pillar planning and the harder
 * generators (methodology, statistical_validity, weaknesses, synthesis).
 * A third, vision-capable tier (visionModel(), below) exists for exactly
 * one caller -- the `figures` generator -- since neither Groq nor
 * Featherless can serve an image-input call right now.
 *
 * Two providers per tier: Groq primary, Featherless fallback (an
 * OpenAI-compatible API with no first-party AI SDK provider, hence
 * @ai-sdk/openai-compatible). lib/ai/fallbackModel.ts's withFallback() only
 * reroutes on a quota/rate-limit-shaped failure from Groq -- a real error
 * (bad request, invalid model) still surfaces immediately. Either provider
 * is optional on its own: with only one API key set, that provider is used
 * directly, unwrapped.
 *
 * Model picks here were verified live, not guessed. Groq: every call in this
 * codebase goes through generateObject (schema or enum mode), and Groq's
 * structured-outputs docs plus a real 400 hit while building this confirm
 * only two models support that at all -- openai/gpt-oss-20b and -120b, the
 * only two candidates for either tier regardless of their rate limits
 * (llama-3.1-8b-instant has a far higher daily allowance but 400s on any
 * `response_format: json_schema` request). Featherless: verified by an
 * actual authenticated chat completion against the account this was built
 * against (Qwen/Qwen2.5-7B and -72B-Instruct both returned 200; meta-llama's
 * repos on Featherless are gated behind a HuggingFace org connection and 403
 * without it).
 *
 * Caveat worth knowing, not enforced in code: Featherless's flat-rate "Chat
 * Plan" ($25/mo) is contractually for interactive human use in their own UI,
 * not "app/API traffic" -- what this file does. The pay-per-token Developer
 * plan is the one their terms describe as intended for this. Whether that
 * matters is a call for whoever holds the account, not something to silently
 * route around here.
 */

function getGroqModel(envVar: "GROQ_MODEL_FAST" | "GROQ_MODEL_STRONG", fallbackId: string): LanguageModelV2 | undefined {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return undefined;
  const groq = createGroq({ apiKey });
  return groq(process.env[envVar] ?? fallbackId);
}

function getFeatherlessModel(
  envVar: "FEATHERLESS_MODEL_FAST" | "FEATHERLESS_MODEL_STRONG",
  fallbackId: string,
): LanguageModelV2 | undefined {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey) return undefined;
  const featherless = createOpenAICompatible({
    name: "featherless",
    baseURL: "https://api.featherless.ai/v1",
    apiKey,
  });
  return featherless(process.env[envVar] ?? fallbackId);
}


/**
 * OpenRouter as a large-context tier.
 *
 * WHY THIS EXISTS. Every generator call carries the whole paper
 * (lib/prompts/contextBlock.ts, per docs/PLAN-V1.md 2's deliberate "whole
 * paper in context, stable citation ids, no embeddings"). For a real paper
 * that is 13-22k input tokens per request. Groq's on-demand tier allows
 * 8,000 tokens per minute on BOTH gpt-oss-20b and gpt-oss-120b (measured
 * live off x-ratelimit-limit-tokens, not assumed), so a single whole-paper
 * request is rejected outright with "Request too large" no matter how slowly
 * the caller paces itself. Waiting cannot fix a request that exceeds the
 * entire minute's budget.
 *
 * That made the catalog unindexable (issue #279) on the free tier, which is
 * a provider limit rather than anything wrong with the design. OpenRouter
 * serves free models with 128k-1M context windows; nvidia/nemotron-3-super-
 * 120b-a12b:free was verified live at 22,400 input tokens in ~5s returning
 * valid `response_format: json_schema` output, which is what every generator
 * needs (they all go through generateObject).
 *
 * `reasoning: { exclude: true }` is not optional. Without it this model emits
 * its reasoning trace ahead of the JSON and the structured parse fails at
 * character 0 -- confirmed live, and the reason a first attempt looked like
 * a model that could not do structured output at all.
 */
function getOpenRouterModel(
  envVar: "OPENROUTER_MODEL_FAST" | "OPENROUTER_MODEL_STRONG",
  fallbackId: string,
): LanguageModelV2 | undefined {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return undefined;
  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    supportsStructuredOutputs: true,
    // Injected here rather than per call site: every caller of this tier goes
    // through generateObject and needs the same thing, and a flag that has to
    // be remembered at ~20 generator call sites is a flag that will be
    // forgotten at one of them. Reasoning models on OpenRouter otherwise emit
    // their trace ahead of the JSON, which fails the structured parse at
    // character 0.
    fetch: async (input, init) => {
      if (init?.body && typeof init.body === "string") {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>;
          body.reasoning = { exclude: true };
          init = { ...init, body: JSON.stringify(body) };
        } catch {
          // Not JSON we recognise: send it through untouched rather than
          // breaking a request we do not understand.
        }
      }
      return fetch(input, init);
    },
  });
  return openrouter(process.env[envVar] ?? fallbackId);
}

function resolveTier(
  groqEnvVar: "GROQ_MODEL_FAST" | "GROQ_MODEL_STRONG",
  groqDefault: string,
  featherlessEnvVar: "FEATHERLESS_MODEL_FAST" | "FEATHERLESS_MODEL_STRONG",
  featherlessDefault: string,
  openRouterEnvVar: "OPENROUTER_MODEL_FAST" | "OPENROUTER_MODEL_STRONG",
  openRouterDefault: string,
): LanguageModel {
  const groqModel = getGroqModel(groqEnvVar, groqDefault);
  const featherlessModel = getFeatherlessModel(featherlessEnvVar, featherlessDefault);
  const openRouterModel = getOpenRouterModel(openRouterEnvVar, openRouterDefault);

  // OpenRouter first when configured, because the calls this serves are
  // whole-paper calls and Groq's 8k TPM cannot accept one at all (see
  // getOpenRouterModel). Groq stays in the chain rather than being dropped:
  // it is faster and cheaper for any caller whose context does fit, and on a
  // paid Groq tier it becomes the better primary again, which is a config
  // change (PEPIROS_PREFER_GROQ=1) rather than a code change.
  const preferGroq = process.env.PEPIROS_PREFER_GROQ === "1";
  const ordered = preferGroq
    ? [groqModel, openRouterModel, featherlessModel]
    : [openRouterModel, groqModel, featherlessModel];
  const available = ordered.filter((m): m is LanguageModelV2 => Boolean(m));

  if (available.length === 0) {
    throw new Error(
      "No model provider is configured. Set at least one of OPENROUTER_API_KEY, " +
        "GROQ_API_KEY or FEATHERLESS_API_KEY. Copy .env.example to .env.",
    );
  }
  // Chains every configured provider, not just the first two: observed live
  // indexing real catalog papers that Featherless was silently unreachable
  // whenever both OpenRouter and Groq were also configured (always true in
  // this project's .env), since withFallback(a, b) only ever sees the first
  // pair. OpenRouter's free daily quota can exhaust mid-run and Groq's 8k
  // TPM can't take a whole paper either -- Featherless accepting the same
  // request (verified live) is the difference between a paper failing
  // outright and one more real provider to try before it does.
  return available.reduce((primary, next) => withFallback(primary, next));
}

/** Fast/cheap tier: archetype classification, high-volume leaf generators. */
export function fastModel(): LanguageModel {
  return resolveTier(
    "GROQ_MODEL_FAST",
    "openai/gpt-oss-20b",
    "FEATHERLESS_MODEL_FAST",
    "Qwen/Qwen2.5-7B-Instruct",
    "OPENROUTER_MODEL_FAST",
    "nvidia/nemotron-3-super-120b-a12b:free",
  );
}

/** Strong tier: pillar planning, methodology/statistical_validity/weaknesses/synthesis. */
export function strongModel(): LanguageModel {
  return resolveTier(
    "GROQ_MODEL_STRONG",
    "openai/gpt-oss-120b",
    "FEATHERLESS_MODEL_STRONG",
    "Qwen/Qwen2.5-72B-Instruct",
    "OPENROUTER_MODEL_STRONG",
    "nvidia/nemotron-3-super-120b-a12b:free",
  );
}

/**
 * Vision-capable tier: the `figures` generator's image-captioning call
 * (issue #59), the one call in this codebase that needs to see an actual
 * image rather than extracted text. Neither of the two tiers above can
 * serve this: Groq has no vision-capable model on this account at all
 * (checked live against its real model list), and Featherless's vision
 * models (the Qwen2.5-VL family) returned `capacity_exhausted` on every
 * attempt, retried across multiple models and after a delay.
 *
 * OpenRouter (openrouter.ai) instead: an aggregator, not a single model
 * host, so a rate-limited free model has real alternatives under the same
 * key rather than being a single point of failure the way one specific
 * Featherless model was. Verified live: a real `google/gemma-4-26b-a4b-
 * it:free` chat completion with an actual embedded image returned a
 * correct description at `cost: 0`, and the same model returns valid
 * structured JSON via `response_format: json_schema` -- both things this
 * codebase actually needs (every generator call goes through
 * `generateObject`), not just a plausible-looking model name.
 *
 * No fallback model wired here (unlike fastModel()/strongModel()'s
 * two-provider design): there is exactly one confirmed-working free
 * vision model right now, and adding an untested second one would be
 * exactly the kind of "plausible-looking" choice this project's own
 * conventions warn against. A 429 from OpenRouter's shared free pool
 * surfaces as this one generator's failure, absorbed by the orchestrator's
 * existing per-leaf failure isolation the same way any other generator
 * failing already is -- not a reason to fail the whole ingest.
 */
export function visionModel(): LanguageModel {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Get a free key at https://openrouter.ai (no card required) to use the figures generator.",
    );
  }
  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    // Without this, the AI SDK doesn't know this model supports a real
    // `response_format: json_schema` call (verified live, see above) and
    // falls back to a weaker prompt-injected JSON mode -- confirmed live to
    // fail outright ("Invalid JSON response") on this free model.
    supportsStructuredOutputs: true,
  });
  return openrouter(process.env.OPENROUTER_MODEL_VISION ?? "google/gemma-4-26b-a4b-it:free");
}
