import "server-only";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/**
 * Model routing (docs/PLAN-V1.md §3.2): a fast/cheap tier for the archetype
 * classifier and the high-volume leaf-generator fan-out (prompt-cached on the
 * paper block), a stronger tier for pillar planning and the harder
 * generators (methodology, statistical_validity, weaknesses, synthesis).
 * This project runs on Groq, not Anthropic -- model ids are env-configurable
 * rather than hardcoded, since Groq's hosted lineup changes over time. See
 * .env.example for the current defaults and README for the full list this
 * SDK version knows about.
 */

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not set. Copy .env.example to .env and add a Groq API key (https://console.groq.com/keys).");
  }
  return key;
}

let groqProvider: ReturnType<typeof createGroq> | undefined;

function getGroqProvider() {
  if (!groqProvider) {
    groqProvider = createGroq({ apiKey: getGroqApiKey() });
  }
  return groqProvider;
}

/** Fast/cheap tier: archetype classification, high-volume leaf generators. */
export function fastModel(): LanguageModel {
  return getGroqProvider()(process.env.GROQ_MODEL_FAST ?? "llama-3.1-8b-instant");
}

/** Strong tier: pillar planning, methodology/statistical_validity/weaknesses/synthesis. */
export function strongModel(): LanguageModel {
  return getGroqProvider()(process.env.GROQ_MODEL_STRONG ?? "llama-3.3-70b-versatile");
}
