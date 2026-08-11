import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { mockSession, type MockUser } from "@/lib/mock/session";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/mcp", label: "For Claude" },
  { href: "/discover", label: "Discover" },
  { href: "/about", label: "About" },
] as const;

/**
 * Site chrome header, shared by the `(marketing)` and `(platform)` route
 * groups. Auth-aware via an optional `session` prop: a group's layout passes
 * it explicitly to control the right-aligned auth slot; omitting it falls
 * back to the `mockSession` default (signed-out), which is what the
 * `(marketing)` group's layout relies on.
 */
export function SiteHeader({
  session = mockSession,
}: {
  session?: { user: MockUser } | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-topbar max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" aria-label="Pepiros home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-sm text-ink-muted transition-colors duration-fast ease-out hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface-raised font-mono text-xs text-ink"
                aria-hidden="true"
              >
                {session.user.avatarInitials}
              </span>
              <span className="hidden font-sans text-sm text-ink sm:inline">
                {session.user.name}
              </span>
            </div>
          ) : (
            <>
              <Link href="/login" className={buttonClassName("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonClassName("secondary", "sm")}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
