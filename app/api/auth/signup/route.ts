import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/data/adapter";
import { SESSION_COOKIE, SESSION_MAX_AGE, serializeSession } from "@/lib/auth/session";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  displayName: z.string().min(1),
});

/**
 * Create an account, backed by the data adapter's createAccount(). The seed
 * adapter (no Supabase project, or PEPIROS_PLATFORM_BACKEND unset) returns an
 * honest error rather than a fake success -- there is nowhere to persist a new
 * account in that mode.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await getAdapter().createAccount(parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const res = NextResponse.json({ profile: result.profile });
  res.cookies.set(SESSION_COOKIE, await serializeSession(result.profile.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
