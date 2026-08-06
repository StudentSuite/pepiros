import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";

/**
 * Minimal hand-rolled LanguageModelV2 fake for testing generateObject callers
 * (archetypeClassifier, pillarPlanner, generators) without a real Groq API
 * key or network call. `ai/test`'s own MockLanguageModelV2 pulls in `msw`
 * transitively (@ai-sdk/provider-utils/test imports it eagerly), which is a
 * real dependency to add for one helper class -- this covers the same need
 * with no extra dependency.
 */
export function mockTextModel(responseText: string): LanguageModelV2 {
  const calls: LanguageModelV2CallOptions[] = [];

  return {
    specificationVersion: "v2",
    provider: "test",
    modelId: "test-model",
    supportedUrls: {},
    doGenerate: async (options: LanguageModelV2CallOptions) => {
      calls.push(options);
      return {
        content: [{ type: "text" as const, text: responseText }],
        finishReason: "stop" as const,
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        warnings: [],
      };
    },
    doStream: async () => {
      throw new Error("mockTextModel does not support streaming -- this test suite only exercises generateObject");
    },
    // Exposed for assertions on what the caller actually sent the model.
    _calls: calls,
  } as LanguageModelV2 & { _calls: LanguageModelV2CallOptions[] };
}
