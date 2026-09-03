import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { isDemoAccount } from "@/lib/data/demo";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { DemoNotice } from "@/components/settings/DemoNotice";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const prefs = await getAdapter().getNotificationPrefs(profile.id);
  const demo = isDemoAccount(profile);

  return (
    <div>
      {demo && <DemoNotice />}

      {/* Issue #142: same reasoning as settings/profile/page.tsx's header. */}
      <header className="pb-s-5">
        <h2 className="font-sans font-semibold text-lg text-ink">Notifications</h2>
        <p className="mt-1 max-w-prose font-sans text-sm leading-relaxed text-ink-faint">
          What Pepiros emails you about.
        </p>
      </header>

      <NotificationPrefs initial={prefs} readOnly={demo} />
    </div>
  );
}
