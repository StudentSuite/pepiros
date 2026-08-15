import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";

/**
 * Settings shell.
 *
 * One wide column with a quiet section rail, rather than the previous grid of
 * bordered cards. Settings pages are read top to bottom and changed rarely, so
 * they want calm and a single alignment axis, not per-setting chrome.
 *
 * The Danger zone is hidden entirely on the shared demo account. Hiding it in
 * the nav is not the security boundary; the page itself redirects (see
 * settings/danger/page.tsx). This just avoids advertising a door that is locked.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSession();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-s-7">
      <header>
        <h1 className="font-serif text-2xl leading-tight text-ink">Settings</h1>
        <p className="mt-s-2 font-sans text-sm text-ink-muted">
          Your profile, how agents connect, and what Pepiros tells you about.
        </p>
      </header>

      <div className="mt-s-6 flex flex-col gap-s-6 md:flex-row md:gap-s-8">
        <SettingsNav showDanger={!isDemoAccount(profile)} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
