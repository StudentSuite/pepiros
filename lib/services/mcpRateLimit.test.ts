import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./mcpRateLimit";

describe("checkRateLimit", () => {
  it("allows calls up to the configured limit, then blocks", () => {
    const tokenId = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(tokenId, "add_paper")).toEqual({ ok: true });
    }
    const blocked = checkRateLimit(tokenId, "add_paper");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks each token independently", () => {
    const tokenA = `a-${Math.random()}`;
    const tokenB = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(tokenA, "add_paper");
    expect(checkRateLimit(tokenA, "add_paper").ok).toBe(false);
    expect(checkRateLimit(tokenB, "add_paper").ok).toBe(true);
  });

  it("tracks each tool independently for the same token", () => {
    const tokenId = `tool-split-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(tokenId, "add_paper");
    expect(checkRateLimit(tokenId, "add_paper").ok).toBe(false);
    // A different, unconfigured tool name falls back to the generous
    // "default" bucket, which is a separate key -- add_paper's cap doesn't
    // bleed into every other tool call.
    expect(checkRateLimit(tokenId, "search_paper").ok).toBe(true);
  });

  it("uses the generous default limit for a tool with no specific cap", () => {
    const tokenId = `default-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit(tokenId, "search_paper").ok).toBe(true);
    }
    expect(checkRateLimit(tokenId, "search_paper").ok).toBe(false);
  });
});
