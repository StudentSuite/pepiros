/**
 * In-memory per-key token bucket, for inbound HTTP rate limiting in
 * middleware.ts (issue #232).
 *
 * WHY THIS IS NOT lib/services/mcpRateLimit.ts. That limiter is the right
 * shape for MCP: it does an atomic increment-and-check in Postgres, so two
 * concurrent calls on one token cannot both read a stale count (issue #159).
 * It cannot be reused here. Middleware runs before the Node runtime on the
 * matched request path, and reaching Postgres from it would put a database
 * round trip in front of every generation request, which is a worse problem
 * than the one being solved.
 *
 * KNOWN LIMITATION, stated rather than hidden: this is process-local, so on a
 * serverless deployment each warm instance keeps its own buckets and the
 * effective limit is the configured one multiplied by the number of live
 * instances. That is the same caveat lib/services/related.ts already records
 * for its own throttle. It still removes the case this exists for, which is
 * one caller looping an unauthenticated endpoint that costs model tokens per
 * request. A limiter that is approximate under scale-out beats no limiter.
 *
 * A token bucket rather than a fixed window because it allows a short burst
 * (opening the reader fires several generation requests at once, legitimately)
 * while still capping the sustained rate. A fixed window would either reject
 * that burst or have to be set high enough to make the sustained cap useless.
 */

export interface BucketConfig {
  /** Maximum burst, and the bucket's starting fill. */
  capacity: number;
  /** Sustained rate: how long one token takes to come back. */
  refillIntervalMs: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Buckets are only swept when the map gets large, rather than on a timer:
 * middleware has no lifecycle to hang an interval off, and a timer would keep
 * a serverless instance from going idle. Full refill means the entry is
 * indistinguishable from a new one, so dropping it loses nothing.
 */
const SWEEP_THRESHOLD = 10_000;

function sweep(now: number, config: BucketConfig): void {
  const fullAfterMs = config.capacity * config.refillIntervalMs;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > fullAfterMs) buckets.delete(key);
  }
}

export type RateLimitVerdict = { ok: true } | { ok: false; retryAfterMs: number };

/**
 * Takes one token for `key`, refilling continuously since the last call.
 *
 * Exported for tests as well as middleware, which is why the clock is a
 * parameter: a rate limiter whose tests depend on real elapsed time is a
 * rate limiter with flaky tests.
 */
export function takeToken(
  key: string,
  config: BucketConfig,
  now: number = Date.now(),
): RateLimitVerdict {
  if (buckets.size > SWEEP_THRESHOLD) sweep(now, config);

  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? { tokens: config.capacity, updatedAt: now };

  if (existing) {
    const refilled = Math.floor((now - bucket.updatedAt) / config.refillIntervalMs);
    if (refilled > 0) {
      bucket.tokens = Math.min(config.capacity, bucket.tokens + refilled);
      // Advance by whole tokens only. Setting updatedAt to `now` would throw
      // away the remainder every call, so a caller polling faster than the
      // refill interval would never accrue a token at all.
      bucket.updatedAt += refilled * config.refillIntervalMs;
    }
  }

  if (bucket.tokens <= 0) {
    buckets.set(key, bucket);
    const waited = now - bucket.updatedAt;
    return { ok: false, retryAfterMs: Math.max(0, config.refillIntervalMs - waited) };
  }

  bucket.tokens -= 1;
  if (!existing) bucket.updatedAt = now;
  buckets.set(key, bucket);
  return { ok: true };
}

/** Test seam: the module-level map would otherwise leak state between cases. */
export function resetBuckets(): void {
  buckets.clear();
}
