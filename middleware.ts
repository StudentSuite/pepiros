import { NextResponse, type NextRequest } from "next/server";
import { parseSession, SESSION_COOKIE } from "@/lib/auth/session";

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
  "/home",
  "/workspaces",
  "/posts",
  "/analytics",
  "/comments",
  "/settings",
  "/onboarding",
  "/welcome",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    "/home/:path*",
    "/workspaces/:path*",
    "/posts/:path*",
    "/analytics/:path*",
    "/comments/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/welcome/:path*",
  ],
};
