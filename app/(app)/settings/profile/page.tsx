import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ProfileForm } from "@/components/settings/ProfileForm";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  return (
    <SettingsSection
      title="Profile"
      description="How you appear to other readers."
    >
      <ProfileForm profile={profile} />
    </SettingsSection>
  );
}
