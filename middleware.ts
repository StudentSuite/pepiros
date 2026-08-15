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
  "/upload",
  "/w",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!needsAuth) return NextResponse.next();

  const profileId = await parseSession(req.cookies.get(SESSION_COOKIE)?.value);
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
    "/upload/:path*",
    "/w/:path*",
  ],
};
