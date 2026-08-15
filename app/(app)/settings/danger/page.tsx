import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { DangerZone } from "@/components/settings/DangerZone";

export const metadata: Metadata = { title: "Danger zone" };

export default async function DangerPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  return (
    <SettingsSection
      title="Danger zone"
      description="Irreversible actions. Read them twice."
      tone="danger"
    >
      <DangerZone username={profile.username} />
    </SettingsSection>
  );
}
