import "server-only";
import { incrementRateLimitWindow } from "@/lib/db/queries";

/**
 * Per-token rate limiting (docs/PLAN-V1.md §13.4: "Rate limit per token...
 * add_paper is the expensive one, cap it hard"). Real Postgres (issue
 * #159) -- this used to be a process-local in-memory Map, the same class
 * of bug #109 already fixed for mcp_tokens: on a serverless deployment,
 * two concurrent calls on the same token routed to two different warm
 * instances each see an empty/fresh window and each pass the check
 * independently, so the "cap it hard" limit was bypassed by nothing more
 * than normal request distribution, not an attacker exploit. The
 * increment-and-check is one atomic UPSERT (lib/db/queries's
 * incrementRateLimitWindow) so two concurrent requests can't both read a
 * stale count before either commits. Only ever consulted for a real token
 * (mcp/tools/index.ts's `session`) -- the unrestricted local-dev path (no
 * token configured) was never in scope for this.
 */

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

/**
 * `add_paper` capped hardest per §13.4's own wording; everything else gets
 * one shared, generous default.
 *
 * `mcp_oauth_register`/`mcp_oauth_token` (issue #222): the OAuth
 * registration and token endpoints are unauthenticated by RFC 7591/6749
 * design -- there's no token id to key a per-caller bucket on yet, so these
 * two are keyed by client IP instead (see the two route handlers) rather
 * than left with no cap at all, which let an anonymous caller insert
 * unbounded rows into mcp_oauth_clients or brute-force code/client_secret
 * guesses with zero backoff.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  add_paper: { limit: 5, windowMs: 10 * 60 * 1000 },
  mcp_oauth_register: { limit: 10, windowMs: 60 * 60 * 1000 },
  mcp_oauth_token: { limit: 20, windowMs: 60 * 1000 },
  default: { limit: 60, windowMs: 60 * 1000 },
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

/**
 * Best-effort caller IP for the two unauthenticated OAuth routes (issue
 * #222) -- there's no token id to key on before a credential exists, so this
 * is the only per-caller signal available. `x-forwarded-for` is
 * client-settable and thus spoofable by a direct, unproxied caller, but
 * behind the reverse proxy every real deployment of this app runs behind,
 * the proxy overwrites/appends its own trusted value, so this is the
 * standard "good enough" signal for a rate-limit bucket (not an
 * authorization decision).
 */
export function clientIpFrom(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function checkRateLimit(tokenId: string, toolName: string): Promise<RateLimitResult> {
  const bucket = toolName in RATE_LIMITS ? toolName : "default";
  const config = RATE_LIMITS[bucket]!;
  const key = `${tokenId}:${bucket}`;

  const { count, windowStart } = await incrementRateLimitWindow(key, config.windowMs);

  if (count > config.limit) {
    const retryAfterMs = config.windowMs - (Date.now() - windowStart.getTime());
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  return { ok: true };
}
