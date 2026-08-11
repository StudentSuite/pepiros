import "server-only";
import { APICallError } from "ai";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";

/**
 * Worth failing over for: anything specific to the primary provider or this
 * particular account/key on it, which a second provider (different account
 * entirely) wouldn't share -- rate limits (429), billing/quota (402), auth
 * (401 invalid/revoked key, 403 forbidden -- including Featherless's own
 * "this model is gated, connect HuggingFace" 403, observed while building
 * this), or a transient failure the provider itself marked retryable.
 *
 * NOT worth failing over for: 400 (malformed request/schema) or 404 (wrong
 * model id). Both are configuration bugs on our end -- a different provider
 * wouldn't fix a bad schema, and a typo'd model id should fail loudly so it
 * gets fixed, not silently degrade to a second provider forever.
 */
function isProviderUnavailable(err: unknown): boolean {
  if (!(err instanceof APICallError)) return false;
  if (err.isRetryable) return true;
  return err.statusCode !== undefined && [401, 402, 403, 429].includes(err.statusCode);
}

/**
 * Wraps two LanguageModelV2s so every caller (lib/agents/*, via
 * lib/ai/client.ts's fastModel()/strongModel()) sees one model: try
 * `primary`, and only when it's unavailable in a way specific to it (see
 * isProviderUnavailable), retry the identical call against `fallback`. Used
 * to route Groq (primary) to Featherless (fallback) per tier, without either
 * generator code or its tests knowing two providers are involved.
 */
export function withFallback(primary: LanguageModelV2, fallback: LanguageModelV2): LanguageModelV2 {
  return {
    specificationVersion: "v2",
    provider: `${primary.provider}+fallback:${fallback.provider}`,
    modelId: primary.modelId,
    supportedUrls: primary.supportedUrls,
    doGenerate: async (options: LanguageModelV2CallOptions) => {
      try {
        return await primary.doGenerate(options);
      } catch (err) {
        if (!isProviderUnavailable(err)) throw err;
        return fallback.doGenerate(options);
      }
    },
    doStream: async (options: LanguageModelV2CallOptions) => {
      try {
        return await primary.doStream(options);
      } catch (err) {
        if (!isProviderUnavailable(err)) throw err;
        return fallback.doStream(options);
      }
    },
  };
}
