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

function resolveTier(
  groqEnvVar: "GROQ_MODEL_FAST" | "GROQ_MODEL_STRONG",
  groqDefault: string,
  featherlessEnvVar: "FEATHERLESS_MODEL_FAST" | "FEATHERLESS_MODEL_STRONG",
  featherlessDefault: string,
): LanguageModel {
  const groqModel = getGroqModel(groqEnvVar, groqDefault);
  const featherlessModel = getFeatherlessModel(featherlessEnvVar, featherlessDefault);

  if (groqModel && featherlessModel) return withFallback(groqModel, featherlessModel);
  if (groqModel) return groqModel;
  if (featherlessModel) return featherlessModel;

  throw new Error(
    "Neither GROQ_API_KEY nor FEATHERLESS_API_KEY is set. Copy .env.example to .env and add at least one.",
  );
}

/** Fast/cheap tier: archetype classification, high-volume leaf generators. */
export function fastModel(): LanguageModel {
  return resolveTier("GROQ_MODEL_FAST", "openai/gpt-oss-20b", "FEATHERLESS_MODEL_FAST", "Qwen/Qwen2.5-7B-Instruct");
}

/** Strong tier: pillar planning, methodology/statistical_validity/weaknesses/synthesis. */
export function strongModel(): LanguageModel {
  return resolveTier("GROQ_MODEL_STRONG", "openai/gpt-oss-120b", "FEATHERLESS_MODEL_STRONG", "Qwen/Qwen2.5-72B-Instruct");
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
