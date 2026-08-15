import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/data/adapter";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  serializeSession,
} from "@/lib/auth/session";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Sign in. Backed by the data adapter, so it works identically whether the
 * seed generator or Supabase is behind it.
 *
 * The failure response is deliberately generic and does not distinguish
 * "no such account" from "wrong password", so it cannot be used to enumerate
 * accounts.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const profile = await getAdapter().verifyCredentials(username, password);
  if (!profile) {
    return NextResponse.json(
      { error: "Those credentials did not match an account." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ profile });
  res.cookies.set(SESSION_COOKIE, await serializeSession(profile.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
