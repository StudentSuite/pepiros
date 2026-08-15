import { SettingsNav } from "@/components/settings/SettingsNav";

/**
 * Settings shell.
 *
 * Split into real routes rather than the previous single 249-line page with
 * four local-state tabs. Each section is now linkable and independently
 * loadable, which matters most for MCP tokens: the sidebar links straight to
 * it, and it needs room to be a real table rather than a tab panel.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl p-s-5">
      <div>
        <h1 className="font-serif text-xl leading-tight text-ink">Settings</h1>
        <p className="mt-s-1 font-sans text-sm text-ink-muted">
          Your profile, how agents connect, and what Pepiros tells you about.
        </p>
      </div>

      <div className="mt-s-5 flex flex-col gap-s-5 md:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
