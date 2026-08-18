// POST. Revokes every one of the current profile's password sessions
// (issue #85's "log out of all devices"), then clears this device's own
// cookie the same way POST /api/auth/logout does -- "everywhere" includes
// here.
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/data/adapter";
import { SESSION_COOKIE, getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const profile = await getSession();
  if (!profile) {
    return NextResponse.json({ error: "Sign in to do this." }, { status: 401 });
  }
  // The shared guest/guest credential: revoking "every session" here would
  // sign out every concurrent visitor using the demo, not just the caller.
  if (isDemoAccount(profile)) {
    return NextResponse.json(
      { error: "The shared demo account cannot sign out everywhere -- that would sign out every visitor using it." },
      { status: 403 },
    );
  }

  await getAdapter().revokeAllSessions(profile.id);

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // No Supabase session to clear in this deployment mode.
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
