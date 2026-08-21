// POST. Sets a new password using the Supabase session app/auth/
// reset-callback/route.ts established from the emailed link's recovery
// code -- createSupabaseServerClient() reads that session back from its own
// cookies, so this route needs no token in the request body, only the new
// password. If there's no valid recovery session (link expired, cookie
// missing, or the request just didn't come through that flow), Supabase's
// updateUser() itself rejects it -- this route doesn't re-derive that check.
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/data/adapter";

const Body = z.object({ password: z.string().min(8) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 401 },
      );
    }

    // Issue #272: this used to stop here, leaving this app's own
    // pepiros_session cookie (a completely separate credential from the
    // Supabase Auth session just reset above) valid for up to its
    // remaining 7-day lifetime on any other device -- defeating the whole
    // point of a password reset if an attacker already held a copy. No
    // getSession() call exists on this route (the caller authenticates via
    // the emailed recovery session, not necessarily a signed-in
    // pepiros_session at all), but profiles.id is the same id as
    // auth.users.id (supabase/migrations/0001_platform.sql), so the
    // just-updated Supabase user's own id is the right one to revoke.
    // Deliberately not reissuing a fresh cookie here, unlike change-password
    // -- the existing client flow already sends the user to /login to sign
    // in with their new password, not straight back into the app.
    if (data.user) await getAdapter().revokeAllSessions(data.user.id);
  } catch {
    return NextResponse.json(
      { error: "Password reset is not configured for this deployment." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
