import { NextResponse, type NextRequest } from "next/server";
import { parseSession, SESSION_COOKIE } from "@/lib/auth/session";
import { takeToken, type BucketConfig } from "@/lib/rateLimit/tokenBucket";

/**
 * Route protection for the signed-in surfaces.
 *
 * Before this existed, /workspaces, /settings and the reader were reachable by
 * anyone who typed the URL; robots.txt disallowed them, which keeps them out of
 * search results but is not access control.
 *
 * Signature verification only -- no database round trip -- so this stays cheap
 * enough to run on every matched request.
 *
 * WHAT IS DELIBERATELY NOT HERE. `/w` (the reader and canvas) and `/upload`
 * are open to guests. Sign-in buys persistence, not access: a reader can
 * bring a paper and get an answer without an account, and finds out what an
 * account is for by having used the thing first. Guest surfaces say plainly
 * that the work is not saved (components/auth/GuestBanner.tsx) -- that
 * warning is what makes open access honest rather than a trap.
 *
 * The account-shaped routes below stay protected, because they are
 * meaningless without an identity: there is no guest inbox or guest billing.
 */
const PROTECTED = [
  // Issue #234. Middleware only guarantees a session; the is_admin check is in
  // the page, because middleware does no database round trip by design.
  "/admin",
  "/home",
  "/workspaces",
  "/posts",
  "/analytics",
  "/comments",
  "/settings",
  "/onboarding",
  "/welcome",
];

/**
 * Generation routes: reachable without a session by design (see above), and
 * each one spends real model tokens per request. Issue #232: nothing capped
 * them. Rate limiting existed only for MCP OAuth and for outbound third-party
 * fetches, never for inbound HTTP, so one caller could loop any of these.
 *
 * Keeping guests in is the right call. Leaving them uncapped was not.
 */
const GENERATION_ROUTES = [
  "/api/chat",
  "/api/verify",
  "/api/quiz",
  "/api/audit",
  "/api/compare",
  "/api/expand",
  "/api/nodes",
];

/**
 * 20 burst, one token back every 3s (sustained 20/min).
 *
 * Sized off what the app itself does rather than picked round: opening a
 * reader fans out several generation calls at once, so the burst has to
 * absorb a legitimate page load without the reader seeing a 429. The
 * sustained rate is what actually bounds cost.
 */
const GENERATION_LIMIT: BucketConfig = { capacity: 20, refillIntervalMs: 3_000 };

/**
 * `x-forwarded-for` is client-settable and so spoofable by a direct,
 * unproxied caller. Behind the reverse proxy every real deployment runs
 * behind, the proxy overwrites it with a trusted value. Same reasoning, and
 * the same "good enough for a bucket key, never for an authorization
 * decision" caveat, as lib/services/mcpRateLimit.ts's clientIpFrom.
 */
function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (GENERATION_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const verdict = takeToken(`gen:${clientKey(req)}`, GENERATION_LIMIT);
    if (!verdict.ok) {
      const retryAfterSeconds = Math.ceil(verdict.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: "rate_limited",
          detail: "Too many requests. Wait a moment and try again.",
        },
        {
          status: 429,
          // Retry-After is what a well-behaved client backs off on, and
          // omitting it turns a temporary limit into an opaque failure.
          headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
        },
      );
    }
    return NextResponse.next();
  }

  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!needsAuth) return NextResponse.next();

  // A config error (SESSION_SECRET unset in production) must not crash
  // routing for every protected-page request -- fail closed to "not
  // authenticated" instead, same as an actually-missing/invalid cookie, and
  // log server-side so this is diagnosable rather than surfacing as an
  // opaque platform error page on every single visit.
  let profileId: string | null = null;
  try {
    profileId = await parseSession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (err) {
    console.error("[middleware] parseSession failed:", err);
  }
  if (profileId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // Preserve where they were going, so sign-in can return them to it.
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/home/:path*",
    "/workspaces/:path*",
    "/posts/:path*",
    "/analytics/:path*",
    "/comments/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/welcome/:path*",
    // Issue #232. Matched for rate limiting, not for auth: these stay open to
    // guests, they just stop being free to loop.
    "/api/chat/:path*",
    "/api/verify/:path*",
    "/api/quiz/:path*",
    "/api/audit/:path*",
    "/api/compare/:path*",
    "/api/expand/:path*",
    "/api/nodes/:path*",
  ],
};
