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

      {/* Issue #142: mcp-tokens/danger each confirm which section you're in
          with a local heading; profile/security/notifications didn't --
          added here rather than removed there, since a heading also helps
          screen-reader heading navigation. */}
      <header className="pb-s-5">
        <h2 className="font-sans font-semibold text-lg text-ink">Profile</h2>
        <p className="mt-1 max-w-prose font-sans text-sm leading-relaxed text-ink-faint">
          Your display name and bio, shown on your public profile.
        </p>
      </header>

      <ProfileForm profile={profile} readOnly={demo} />
    </div>
  );
}
