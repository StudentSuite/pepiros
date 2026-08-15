import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { DemoNotice } from "@/components/settings/DemoNotice";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  return (
    <div>
      {isDemoAccount(profile) && <DemoNotice />}
      <NotificationPrefs />
    </div>
  );
}
