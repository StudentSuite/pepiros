import { describe, expect, it } from "vitest";
import { APICallError } from "ai";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";
import { withFallback } from "./fallbackModel";

function apiError(statusCode: number, isRetryable = false, message = "boom") {
  return new APICallError({
    message,
    url: "https://example.test",
    requestBodyValues: {},
    statusCode,
    isRetryable,
  });
}

function stubModel(provider: string, behavior: () => Promise<{ text: string }> | never): LanguageModelV2 {
  return {
    specificationVersion: "v2",
    provider,
    modelId: `${provider}-model`,
    supportedUrls: {},
    doGenerate: async (_options: LanguageModelV2CallOptions) => {
      const result = await behavior();
      return {
        content: [{ type: "text" as const, text: result.text }],
        finishReason: "stop" as const,
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
      };
    },
    doStream: async () => {
      throw new Error("not used in these tests");
    },
  };
}

describe("withFallback", () => {
  it("uses the primary model when it succeeds", async () => {
    const primary = stubModel("primary", async () => ({ text: "from primary" }));
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from primary" }]);
  });

  it("reroutes to the fallback on a 429 from the primary", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(429);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from fallback" }]);
  });

  it("reroutes to the fallback on a 402 (quota/billing) from the primary", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(402);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from fallback" }]);
  });

  // Observed live while building this: an invalid/revoked Groq key 401s, not
  // 429s. A different provider entirely (different account, different key)
  // doesn't share that problem, so it belongs in the reroute set too.
  it("reroutes to the fallback on a 401 (invalid/revoked key) from the primary", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(401);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from fallback" }]);
  });

  // Observed live against Featherless while picking models: a gated model
  // (meta-llama's repos, without a HuggingFace org connection) 403s.
  it("reroutes to the fallback on a 403 (forbidden/gated) from the primary", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(403);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from fallback" }]);
  });

  it("reroutes to the fallback when the primary marks its own error retryable", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(503, true);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from fallback" }]);
  });

  // Observed live indexing real catalog papers (Attention Is All You Need,
  // ResNet, BERT): Groq reports its tokens-per-minute cap as a 413, not a
  // 429, so it fell through this function's reroute set entirely until
  // this was added -- every one of them failed on Groq alone with
  // Featherless never even tried.
  it("reroutes on a Groq tokens-per-minute 413", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(
        413,
        false,
        "Request too large for model `openai/gpt-oss-120b` in organization `org_123` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Requested 13795, please reduce your message size and try again.",
      );
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "from fallback" }]);
  });

  it("does not reroute on a 413 unrelated to the TPM cap -- a genuinely oversized request is a real bug", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(413, false, "Payload too large");
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    await expect(model.doGenerate({} as LanguageModelV2CallOptions)).rejects.toThrow("Payload too large");
  });

  it("does not reroute on a 400 -- a malformed request would fail identically on the fallback", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(400);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    await expect(model.doGenerate({} as LanguageModelV2CallOptions)).rejects.toThrow("boom");
  });

  it("does not reroute on a 404 -- a typo'd model id should fail loudly, not silently degrade", async () => {
    const primary = stubModel("primary", async () => {
      throw apiError(404);
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    await expect(model.doGenerate({} as LanguageModelV2CallOptions)).rejects.toThrow("boom");
  });

  it("does not reroute on a non-APICallError -- e.g. a schema validation failure", async () => {
    const primary = stubModel("primary", async () => {
      throw new TypeError("not an API error");
    });
    const fallback = stubModel("fallback", async () => ({ text: "from fallback" }));
    const model = withFallback(primary, fallback);

    await expect(model.doGenerate({} as LanguageModelV2CallOptions)).rejects.toThrow("not an API error");
  });

  const jsonObjectOptions = {
    responseFormat: { type: "json" as const, schema: { type: "object" as const } },
  } as LanguageModelV2CallOptions;

  // Observed live indexing a real catalog paper: OpenRouter's free daily
  // quota was exhausted and it did not error at all -- it returned a 200
  // whose entire text content was the literal string "[3000]". Nothing
  // throws here, so isProviderUnavailable never runs; without this check
  // doGenerate just returns the garbage as if it were a real success.
  it("reroutes to the fallback when the primary succeeds but returns a non-object response for a json-object schema call", async () => {
    const primary = stubModel("primary", async () => ({ text: "[3000]" }));
    const fallback = stubModel("fallback", async () => ({ text: '{"pillars":[]}' }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate(jsonObjectOptions);
    expect(result.content).toEqual([{ type: "text", text: '{"pillars":[]}' }]);
  });

  it("uses the primary's real object response for a json-object schema call, not the fallback", async () => {
    const primary = stubModel("primary", async () => ({ text: '{"pillars":[]}' }));
    const fallback = stubModel("fallback", async () => ({ text: "should not be called" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate(jsonObjectOptions);
    expect(result.content).toEqual([{ type: "text", text: '{"pillars":[]}' }]);
  });

  it("accepts a markdown-fenced object response for a json-object schema call without rerouting", async () => {
    const primary = stubModel("primary", async () => ({ text: '```json\n{"pillars":[]}\n```' }));
    const fallback = stubModel("fallback", async () => ({ text: "should not be called" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate(jsonObjectOptions);
    expect(result.content[0]).toEqual({ type: "text", text: '```json\n{"pillars":[]}\n```' });
  });

  // The archetype classifier's enum-mode calls never set responseFormat to
  // "json" with an object schema, so a real short answer ("rct", three
  // characters) must never be mistaken for a degenerate response.
  it("does not reroute a short response when no json-object responseFormat was requested", async () => {
    const primary = stubModel("primary", async () => ({ text: "rct" }));
    const fallback = stubModel("fallback", async () => ({ text: "should not be called" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate({} as LanguageModelV2CallOptions);
    expect(result.content).toEqual([{ type: "text", text: "rct" }]);
  });

  it("does not reroute a non-object response when the requested json schema isn't itself an object", async () => {
    const arraySchemaOptions = {
      responseFormat: { type: "json" as const, schema: { type: "array" as const } },
    } as LanguageModelV2CallOptions;
    const primary = stubModel("primary", async () => ({ text: "[1,2,3]" }));
    const fallback = stubModel("fallback", async () => ({ text: "should not be called" }));
    const model = withFallback(primary, fallback);

    const result = await model.doGenerate(arraySchemaOptions);
    expect(result.content).toEqual([{ type: "text", text: "[1,2,3]" }]);
  });
});
