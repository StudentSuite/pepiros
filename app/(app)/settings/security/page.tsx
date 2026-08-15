import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { DemoNotice } from "@/components/settings/DemoNotice";

export const metadata: Metadata = { title: "Security settings" };

export default async function SecurityPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");
  const demo = isDemoAccount(profile);

  return (
    <div>
      {demo && <DemoNotice />}

      <SettingsRow
        label="Signed in as"
        description="Sessions use a single HTTP-only cookie and last seven days."
      >
        <p className="truncate font-mono text-sm text-ink-muted">
          @{profile.username}
        </p>
      </SettingsRow>

      <SettingsRow
        label="Password"
        description={
          demo
            ? "The demo account uses a published password on purpose, so anyone can look around without signing up."
            : "Password changes arrive with the rest of Supabase Auth."
        }
      >
        <p className="font-sans text-sm text-ink-faint">Not available yet</p>
      </SettingsRow>

      <SettingsRow
        label="Sign out"
        description="Ends this session on this device."
      >
        <div className="flex sm:justify-end">
          <SignOutButton />
        </div>
      </SettingsRow>
    </div>
  );
}
