import { describe, expect, it, vi } from "vitest";
import { APICallError, NoObjectGeneratedError, TypeValidationError } from "ai";
import { withObjectRetry } from "./generateObjectWithRetry";

function noObjectError() {
  return new NoObjectGeneratedError({
    message: "could not parse the response",
    cause: new Error("bad json"),
    text: "{",
    response: { id: "r1", timestamp: new Date(), modelId: "test" },
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    finishReason: "stop",
  });
}

/** Featherless's real shape: a 200 whose body is an error envelope, so it fails schema validation instead of surfacing as a retryable status. */
function upstreamTimeoutEnvelopeError() {
  return new APICallError({
    message: "Invalid JSON response",
    url: "https://api.featherless.ai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 200,
    cause: TypeValidationError.wrap({
      value: { error: { message: "Upstream idle timeout exceeded", code: 504 } },
      cause: new Error("expected array, received undefined"),
    }),
  });
}

describe("withObjectRetry", () => {
  it("returns the result on the first try without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withObjectRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resamples after a NoObjectGeneratedError and returns the next success", async () => {
    const fn = vi.fn().mockRejectedValueOnce(noObjectError()).mockResolvedValueOnce("ok");
    await expect(withObjectRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error once attempts are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(noObjectError());
    await expect(withObjectRetry(fn, 2)).rejects.toThrow("could not parse the response");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a different kind of error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("rate limited"));
    await expect(withObjectRetry(fn)).rejects.toThrow("rate limited");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resamples after a 200-wrapped upstream-timeout error envelope", async () => {
    const fn = vi.fn().mockRejectedValueOnce(upstreamTimeoutEnvelopeError()).mockResolvedValueOnce("ok");
    await expect(withObjectRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a plain APICallError with no TypeValidationError cause", async () => {
    const fn = vi.fn().mockRejectedValue(
      new APICallError({
        message: "bad request",
        url: "https://api.groq.com/openai/v1/chat/completions",
        requestBodyValues: {},
        statusCode: 400,
      }),
    );
    await expect(withObjectRetry(fn)).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
