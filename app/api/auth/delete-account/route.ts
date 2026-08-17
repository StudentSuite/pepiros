// POST. Real, irreversible account deletion for the current session (issue
// #75) -- see lib/data/adapter.ts's deleteAccount() doc comment for the
// cascade contract. This route only adds the two things a service-layer
// deleteAccount() call can't do itself: the demo-account guard (defense in
// depth alongside app/(app)/settings/danger/page.tsx's redirect) and
// signing the now-deleted account's session out afterward, the same way
// POST /api/auth/logout does.
import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { getAdapter } from "@/lib/data/adapter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const profile = await getSession();
  if (!profile) {
    return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });
  }
  if (isDemoAccount(profile)) {
    return NextResponse.json(
      { error: "The shared demo account cannot be deleted." },
      { status: 403 },
    );
  }

  const result = await getAdapter().deleteAccount(profile.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // No Supabase session to clear in this deployment mode -- the app's own
    // cookie below is still cleared regardless.
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
