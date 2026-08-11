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
