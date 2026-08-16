// POST. Requests a password reset link (issue #45's follow-up: that issue
// collected a real recovery email, this actually sends to it). Always
// resolves 200 -- see lib/data/adapter.ts's requestPasswordReset() doc
// comment for why the response can't distinguish "no such account" from
// "no recovery email" from "link sent" without becoming an enumeration risk.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/data/adapter";

const Body = z.object({ username: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await getAdapter().requestPasswordReset(parsed.data.username);
  if ("error" in result) {
    // Only reached in seed mode (feature unavailable in this deployment,
    // not an account-specific fact) -- see the adapter interface's doc
    // comment for why that distinction is safe to surface and a per-account
    // one isn't.
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
