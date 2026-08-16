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
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ ok: true });
}
