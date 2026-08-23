import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { DangerZone } from "@/components/settings/DangerZone";

export const metadata: Metadata = { title: "Danger zone" };

export default async function DangerPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  // The real guard, not the hidden nav link. Anyone can sign in as the demo
  // account, so account deletion there would let one visitor break the demo for
  // everyone after them, with no owner to restore it.
  if (isDemoAccount(profile)) redirect("/settings/profile");

  return (
    <div>
      <header className="pb-s-2">
        <h2 className="font-sans font-semibold text-lg text-ink">Danger zone</h2>
        <p className="mt-1 max-w-prose font-sans text-[13px] leading-relaxed text-ink-faint">
          These cannot be undone. Read them twice.
        </p>
      </header>
      <DangerZone username={profile.username} />
    </div>
  );
}
