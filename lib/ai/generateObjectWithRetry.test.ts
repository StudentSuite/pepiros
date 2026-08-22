import { describe, expect, it, vi } from "vitest";
import { NoObjectGeneratedError } from "ai";
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
});
