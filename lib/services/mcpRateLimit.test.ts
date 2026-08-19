import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./mcpRateLimit";

describe("checkRateLimit", () => {
  it("allows calls up to the configured limit, then blocks", async () => {
    const tokenId = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(await checkRateLimit(tokenId, "add_paper")).toEqual({ ok: true });
    }
    const blocked = await checkRateLimit(tokenId, "add_paper");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks each token independently", async () => {
    const tokenA = `a-${Math.random()}`;
    const tokenB = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) await checkRateLimit(tokenA, "add_paper");
    expect((await checkRateLimit(tokenA, "add_paper")).ok).toBe(false);
    expect((await checkRateLimit(tokenB, "add_paper")).ok).toBe(true);
  });

  it("tracks each tool independently for the same token", async () => {
    const tokenId = `tool-split-${Math.random()}`;
    for (let i = 0; i < 5; i++) await checkRateLimit(tokenId, "add_paper");
    expect((await checkRateLimit(tokenId, "add_paper")).ok).toBe(false);
    // A different, unconfigured tool name falls back to the generous
    // "default" bucket, which is a separate key -- add_paper's cap doesn't
    // bleed into every other tool call.
    expect((await checkRateLimit(tokenId, "search_paper")).ok).toBe(true);
  });

  it("uses the generous default limit for a tool with no specific cap", async () => {
    const tokenId = `default-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      expect((await checkRateLimit(tokenId, "search_paper")).ok).toBe(true);
    }
    expect((await checkRateLimit(tokenId, "search_paper")).ok).toBe(false);
  });

  // Issue #159: the increment-and-check used to be a plain in-memory Map,
  // read-then-write in application code -- not atomic across concurrent
  // calls. Now backed by one atomic Postgres UPSERT; this confirms N
  // concurrent calls at exactly the limit never let more than `limit`
  // through, which a naive read-then-write race could.
  it("does not let concurrent calls exceed the limit (the race the old in-memory Map was exposed to)", async () => {
    const tokenId = `concurrent-${Math.random()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => checkRateLimit(tokenId, "add_paper")));
    const allowed = results.filter((r) => r.ok).length;
    expect(allowed).toBe(5);
  });
});
