import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  // Login (password or Google) establishes a real Supabase session
  // alongside this app's own pepiros_session cookie -- verifyCredentials()
  // and the OAuth callback both sign in via createSupabaseServerClient(),
  // which sets Supabase's own session cookies via @supabase/ssr. Clearing
  // only this app's cookie left that Supabase session live: middleware.ts
  // correctly treats the app as signed out afterward (it only ever checks
  // pepiros_session), but a still-valid Supabase session cookie remains
  // usable against Supabase's own API directly, and is exactly what #64/#66
  // rely on to authorize a password change -- "signed out" should mean both
  // are gone, not just the one this app's own routing happens to check.
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Missing/invalid Supabase config (createSupabaseServerClient throws) --
    // there's no Supabase session to clear in that deployment mode either
    // way, so this app's own cookie below is still cleared regardless.
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
