import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SignOutButton } from "@/components/settings/SignOutButton";

export const metadata: Metadata = { title: "Security settings" };

export default async function SecurityPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-col gap-s-4">
      <SettingsSection
        title="Sessions"
        description="Pepiros signs you in with a single HTTP-only cookie, valid for seven days."
      >
        <div className="rounded-md border border-border p-s-4">
          <p className="font-sans text-sm text-ink">This device</p>
          <p className="mt-s-1 font-mono text-[11px] text-ink-faint">
            Signed in as @{profile.username}
          </p>
        </div>
        <div className="mt-s-4">
          <SignOutButton />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Password"
        description="Password changes are not available on the demo account."
      >
        <p className="font-sans text-sm text-ink-muted">
          The guest account uses a published password on purpose, so anyone can
          look around without signing up. Real accounts get password management
          when Supabase Auth is wired in.
        </p>
      </SettingsSection>
    </div>
  );
}
