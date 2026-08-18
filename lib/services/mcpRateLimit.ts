import "server-only";

/**
 * Per-token rate limiting (docs/PLAN-V1.md §13.4: "Rate limit per token...
 * add_paper is the expensive one, cap it hard"). In-memory, process-local --
 * the same acceptable-for-now shape as jobs.ts: a real defense against one
 * client hammering the server, even though a multi-instance deployment
 * would need a shared store (Redis, or the DB itself) for the limit to be
 * global rather than per warm serverless instance. Only ever consulted for
 * a real token (mcp/tools/index.ts's `session`) -- the unrestricted local-
 * dev path (no token configured) was never in scope for this.
 */

interface Window {
  count: number;
  windowStart: number;
}

const windows = new Map<string, Window>();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

/** `add_paper` capped hardest per §13.4's own wording; everything else gets one shared, generous default. */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  add_paper: { limit: 5, windowMs: 10 * 60 * 1000 },
  default: { limit: 60, windowMs: 60 * 1000 },
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export function checkRateLimit(tokenId: string, toolName: string): RateLimitResult {
  const bucket = toolName in RATE_LIMITS ? toolName : "default";
  const config = RATE_LIMITS[bucket]!;
  const key = `${tokenId}:${bucket}`;
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now - existing.windowStart >= config.windowMs) {
    windows.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (existing.count >= config.limit) {
    return { ok: false, retryAfterMs: config.windowMs - (now - existing.windowStart) };
  }

  existing.count += 1;
  return { ok: true };
}
