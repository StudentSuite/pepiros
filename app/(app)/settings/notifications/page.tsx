import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";

export const metadata: Metadata = { title: "Notification settings" };

export default function NotificationsPage() {
  return (
    <SettingsSection
      title="Notifications"
      description="What Pepiros tells you about, and what it stays quiet on."
    >
      <NotificationPrefs />
    </SettingsSection>
  );
}
