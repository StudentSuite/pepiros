import "server-only";
import { APICallError } from "ai";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";

type GenerateResult = Awaited<ReturnType<LanguageModelV2["doGenerate"]>>;

/**
 * Worth failing over for: anything specific to the primary provider or this
 * particular account/key on it, which a second provider (different account
 * entirely) wouldn't share -- rate limits (429), billing/quota (402), auth
 * (401 invalid/revoked key, 403 forbidden -- including Featherless's own
 * "this model is gated, connect HuggingFace" 403, observed while building
 * this), or a transient failure the provider itself marked retryable.
 *
 * Also a Groq-specific 413: verified live that Groq reports its
 * tokens-per-minute cap ("Request too large for model ... on tokens per
 * minute (TPM): Limit 8000, Requested 13795") as HTTP 413, not 429, for
 * every real paper long enough to need one -- Attention Is All You Need,
 * ResNet, BERT all hit this on the very first catalog-indexing attempt.
 * That's the same class of thing as a 429 (a quota specific to this
 * account/plan on this provider), just spelled differently by Groq, so it
 * gets the same treatment: reroute to Featherless, whose quota is separate.
 * Narrowly matched on the TPM phrasing rather than every 413, since a
 * genuinely oversized/malformed request (a real bug on our end) should
 * still fail loudly instead of silently degrading to a second provider.
 *
 * NOT worth failing over for: 400 (malformed request/schema) or 404 (wrong
 * model id). Both are configuration bugs on our end -- a different provider
 * wouldn't fix a bad schema, and a typo'd model id should fail loudly so it
 * gets fixed, not silently degrade to a second provider forever.
 */
function isGroqTpmCeiling(err: APICallError): boolean {
  return err.statusCode === 413 && /tokens per minute/i.test(err.message);
}

function isProviderUnavailable(err: unknown): boolean {
  if (!(err instanceof APICallError)) return false;
  if (err.isRetryable) return true;
  if (err.statusCode !== undefined && [401, 402, 403, 429].includes(err.statusCode)) return true;
  return isGroqTpmCeiling(err);
}

/**
 * A second, non-throwing failure mode this wrapper also has to catch:
 * verified live indexing a real catalog paper, OpenRouter's free daily quota
 * was exhausted (see getOpenRouterModel's own doc comment) and instead of
 * erroring, it returned an HTTP 200 whose entire text content was the
 * literal string "[3000]" -- valid JSON, wrong shape, and never anything a
 * schema-validation retry could fix by resampling the same broken provider.
 * Nothing here throws, so isProviderUnavailable never even runs: from
 * doGenerate's perspective the call plainly succeeded, and it would return
 * straight through without ever trying the fallback.
 *
 * Scoped narrowly to schema-mode object calls (`responseFormat.type ===
 * "json"` with an object-typed schema) so this can never misfire on a
 * legitimately short answer -- the archetype classifier's enum-mode calls
 * (a real answer might be "rct", three characters) never reach this check
 * at all, since they don't request that response format.
 */
function looksLikeUsableJsonObject(result: GenerateResult, options: LanguageModelV2CallOptions): boolean {
  const responseFormat = options.responseFormat;
  if (!responseFormat || responseFormat.type !== "json") return true;
  if (responseFormat.schema?.type !== "object") return true;

  const text = result.content.find((part) => part.type === "text")?.text ?? "";
  const trimmed = text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return trimmed.startsWith("{");
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
        const result = await primary.doGenerate(options);
        if (!looksLikeUsableJsonObject(result, options)) return fallback.doGenerate(options);
        return result;
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
