import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { DemoNotice } from "@/components/settings/DemoNotice";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");
  const demo = isDemoAccount(profile);

  return (
    <div>
      {demo && <DemoNotice />}
      <ProfileForm profile={profile} readOnly={demo} />
    </div>
  );
}
