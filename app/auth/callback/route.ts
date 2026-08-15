import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileFromGoogle, type GoogleIdentityInput } from "@/lib/auth/google";
import { SESSION_COOKIE, SESSION_MAX_AGE, serializeInlineSession } from "@/lib/auth/session";

/**
 * Finishes Google sign-in.
 *
 * The browser client started the flow (PKCE), so the code verifier is already
 * in a cookie and Supabase hands back `?code=`. That is exchanged for a
 * session here, server-side, and then translated into the app's own signed
 * cookie -- the Supabase session is not what the rest of the app reads, so
 * carrying both would mean two sources of truth for "who is signed in".
 */
function failTo(origin: string, reason: string) {
  const back = new URL("/login", origin);
  back.searchParams.set("error", reason);
  return NextResponse.redirect(back);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { origin } = url;

  // Google's own failure (user hit "cancel", provider not enabled in the
  // Supabase project, consent withdrawn). Surfaced rather than swallowed.
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return failTo(origin, providerError === "access_denied" ? "cancelled" : "google_failed");
  }

  const code = url.searchParams.get("code");
  if (!code) return failTo(origin, "google_failed");

  let identity: GoogleIdentityInput;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return failTo(origin, "google_failed");

    const meta = (data.user.user_metadata ?? {}) as Record<string, string | undefined>;
    identity = {
      id: data.user.id,
      email: data.user.email ?? null,
      name: meta.full_name ?? meta.name ?? null,
    };
  } catch {
    // Missing/invalid Supabase config throws rather than returning an error.
    return failTo(origin, "google_unavailable");
  }

  // Only ever redirect to a path on this origin. Taking `next` as a full URL
  // would make this an open redirect: ?next=https://evil.example would send a
  // freshly-authenticated user off-site.
  const requested = url.searchParams.get("next") ?? "/home";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/home";

  const res = NextResponse.redirect(new URL(next, origin));
  res.cookies.set(SESSION_COOKIE, await serializeInlineSession(profileFromGoogle(identity)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
