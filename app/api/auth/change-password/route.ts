// POST. Changes the signed-in account's password directly -- unlike POST
// /api/auth/reset-password/confirm, which needs a recovery session from an
// emailed link, this uses the *current* session already established at
// login (verifyCredentials() signs in via createSupabaseServerClient(),
// which sets real Supabase session cookies alongside this app's own
// pepiros_session cookie -- both exist after a real username/password
// login). No current-password re-entry required: the active session itself
// is the proof of authentication, the same as any "change password" flow
// in a settings page.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, SESSION_COOKIE, SESSION_MAX_AGE, serializeSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/data/adapter";

const Body = z.object({ password: z.string().min(8) });

export async function POST(req: Request) {
  const profile = await getSession();
  if (!profile) {
    return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      console.error(`[auth/change-password] updateUser failed for ${profile.username}:`, error.message);
      return NextResponse.json(
        { error: "Could not update your password. Try signing out and back in, then retry." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Password changes are not available for this account." },
      { status: 503 },
    );
  }

  // Issue #272: this used to stop here, leaving this app's own
  // pepiros_session cookie (a completely separate credential from the
  // Supabase Auth session just updated above, 7-day HMAC-signed, tracked in
  // the sessions table) valid for up to its remaining 7-day lifetime --
  // defeating the entire point of a password change if an attacker already
  // held a copy of it. Revoke every session for this account, then reissue
  // a fresh one for the caller's own request so they aren't logged out by
  // their own password change.
  await getAdapter().revokeAllSessions(profile.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await serializeSession(profile.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
