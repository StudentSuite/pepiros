import { beforeEach, describe, expect, it } from "vitest";
import { resetBuckets, takeToken, type BucketConfig } from "./tokenBucket";

const CONFIG: BucketConfig = { capacity: 3, refillIntervalMs: 1_000 };

describe("takeToken", () => {
  beforeEach(() => resetBuckets());

  it("allows a burst up to capacity, then rejects", () => {
    for (let i = 0; i < CONFIG.capacity; i++) {
      expect(takeToken("a", CONFIG, 0)).toEqual({ ok: true });
    }
    expect(takeToken("a", CONFIG, 0).ok).toBe(false);
  });

  it("keys are independent, so one caller cannot exhaust another's budget", () => {
    for (let i = 0; i < CONFIG.capacity; i++) takeToken("a", CONFIG, 0);
    expect(takeToken("b", CONFIG, 0)).toEqual({ ok: true });
  });

  it("refills one token per interval", () => {
    for (let i = 0; i < CONFIG.capacity; i++) takeToken("a", CONFIG, 0);
    expect(takeToken("a", CONFIG, 999).ok).toBe(false);
    expect(takeToken("a", CONFIG, 1_000)).toEqual({ ok: true });
    // That refilled token is spent, so the next call is short again.
    expect(takeToken("a", CONFIG, 1_000).ok).toBe(false);
  });

  it("refills to capacity but never beyond it", () => {
    for (let i = 0; i < CONFIG.capacity; i++) takeToken("a", CONFIG, 0);
    // Idle far longer than a full refill takes.
    const long = 60 * 60 * 1000;
    for (let i = 0; i < CONFIG.capacity; i++) {
      expect(takeToken("a", CONFIG, long)).toEqual({ ok: true });
    }
    expect(takeToken("a", CONFIG, long).ok).toBe(false);
  });

  /**
   * The bug this guards: advancing updatedAt to `now` on every call discards
   * the sub-interval remainder, so a caller polling faster than the refill
   * interval never accrues a whole token and stays blocked forever.
   */
  it("accrues across calls made faster than the refill interval", () => {
    for (let i = 0; i < CONFIG.capacity; i++) takeToken("a", CONFIG, 0);
    for (let t = 100; t < 1_000; t += 100) {
      expect(takeToken("a", CONFIG, t).ok).toBe(false);
    }
    expect(takeToken("a", CONFIG, 1_000)).toEqual({ ok: true });
  });

  it("reports how long to wait when it rejects", () => {
    for (let i = 0; i < CONFIG.capacity; i++) takeToken("a", CONFIG, 0);
    const verdict = takeToken("a", CONFIG, 250);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.retryAfterMs).toBe(750);
  });
});
