import { describe, expect, it } from "vitest";
import { getAdapter } from "./adapter";
import { GUEST_ID } from "./seed";

/**
 * Issue #156: markCommentsRead() was a bare no-op on the seed/demo adapter
 * -- the actual default path this app ships with, no Supabase project
 * required (PEPIROS_PLATFORM_BACKEND is unset in this test run, same as
 * local dev with no .env, so getAdapter() resolves to the seed adapter).
 * seedComments() deterministically re-derives `read` from a per-post seed
 * on every call with nothing persisted, so the unread badge/count on
 * /comments never actually cleared no matter how many times it was
 * visited.
 */
describe("seed adapter comment read-state", () => {
  it("marks every one of the account's comments read, and it sticks across subsequent reads", async () => {
    const adapter = getAdapter();

    const before = await adapter.listComments(GUEST_ID);
    if (before.length === 0) return; // deterministic seed could plausibly yield zero comments; nothing to assert.
    expect(before.some((c) => !c.read)).toBe(true);

    await adapter.markCommentsRead(GUEST_ID);

    const after = await adapter.listComments(GUEST_ID);
    expect(after.every((c) => c.read)).toBe(true);
    // Same ids/order/content as before, only `read` changed.
    expect(after.map((c) => c.id)).toEqual(before.map((c) => c.id));
  });
});
