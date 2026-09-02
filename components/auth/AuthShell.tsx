import { Logo } from "@/components/ui/Logo";
import { Band } from "@/components/chrome/Band";

/**
 * Shared shell for the four auth pages (login, signup, reset-password,
 * reset-password/confirm) -- issue #301.
 *
 * Split layout: form on `--surface`, max ~400px, at `lg` a full-height
 * shader `Band` sits to the right with the tagline over it; below `lg` the
 * band drops entirely and the form alone fills the viewport, centred.
 *
 * Fixes a real inconsistency, not just a visual refresh: all four pages
 * used to nest components/ui/{Input,Button,...} inside a components/shadcn
 * `<Card>` -- two different UI systems stacked in the one place that most
 * wants to feel like a single, deliberate surface. This shell drops the
 * shadcn Card; every page now composes entirely from components/ui/* (which
 * already carries the accessibility wiring -- FormField's aria-invalid/
 * aria-describedby -- Card never had reason to know about).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface lg:grid lg:min-h-[calc(100vh-var(--topbar))] lg:grid-cols-2">
      <div className="mx-auto flex min-h-[var(--centered-page-min-h)] w-full max-w-[400px] flex-col justify-center p-s-5 lg:min-h-0 lg:max-w-none lg:px-s-8">
        <Logo size="md" />
        {children}
      </div>

      {/* Bookend, not decoration everywhere: this is the one shader moment
          on the whole auth flow, confined to one side of the split so it
          never spills into the form column (design/anti-slop.md). */}
      <Band
        as="div"
        variant="dark"
        className="hidden lg:flex lg:items-center lg:justify-center lg:p-s-8"
      >
        <p className="max-w-xs font-sans text-3xl font-semibold leading-[1.15] text-brand-ink-reversed">
          Be the source.
        </p>
      </Band>
    </div>
  );
}
