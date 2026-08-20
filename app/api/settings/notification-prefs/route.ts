// PATCH. Persists one toggle from components/settings/NotificationPrefs.tsx
// (issue #70). Reads the current session's real prefs, applies the one
// changed key, and saves the merged result -- never trusts a client-sent
// full object, so a stale tab can't clobber a toggle changed elsewhere.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { isDemoAccount } from "@/lib/data/demo";

const Body = z.object({
  key: z.enum(["follow", "comment", "like", "digest"]),
  value: z.boolean(),
});

export async function PATCH(req: Request) {
  const profile = await getSession();
  if (!profile) {
    return NextResponse.json({ error: "Sign in to change notification settings." }, { status: 401 });
  }

  // Issue #214: the client-side toggle is now disabled for the demo
  // account too (components/settings/NotificationPrefs.tsx), but this route
  // is the actual write path, so it's the one that has to refuse -- a
  // stale/re-enabled client shouldn't be the only thing standing between a
  // demo visitor and every other demo visitor's notification prefs.
  if (isDemoAccount(profile)) {
    return NextResponse.json(
      { error: "The shared demo account can't save preferences -- everyone who tries Pepiros shares it." },
      { status: 403 },
    );
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
