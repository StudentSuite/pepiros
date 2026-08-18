// PATCH. Persists one toggle from components/settings/NotificationPrefs.tsx
// (issue #70). Reads the current session's real prefs, applies the one
// changed key, and saves the merged result -- never trusts a client-sent
// full object, so a stale tab can't clobber a toggle changed elsewhere.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";

const Body = z.object({
  key: z.enum(["follow", "comment", "like", "digest"]),
  value: z.boolean(),
});

export async function PATCH(req: Request) {
  const profile = await getSession();
  if (!profile) {
    return NextResponse.json({ error: "Sign in to change notification settings." }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const adapter = getAdapter();
  const current = await adapter.getNotificationPrefs(profile.id);
  const next = { ...current, [parsed.data.key]: parsed.data.value };
  await adapter.saveNotificationPrefs(profile.id, next);

  return NextResponse.json({ prefs: next });
}
