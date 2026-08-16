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
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Password reset is not configured for this deployment." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
