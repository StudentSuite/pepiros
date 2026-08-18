"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileNav } from "@/components/site/MobileNav";
import type { Profile } from "@/lib/data/types";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/how-to-use", label: "Guide" },
  { href: "/mcp", label: "For agents" },
  { href: "/discover", label: "Discover" },
  { href: "/about", label: "About" },
] as const;

/**
 * Site chrome header, shared by the `(marketing)` and `(platform)` route
 * groups. Auth-aware via a `session` prop: both group layouts fetch the
 * real signed-in profile (lib/auth/session.ts's getSession()) and pass it
 * in -- issue #88: this used to default to a hardcoded mock `null`, which
 * both layouts either passed explicitly or fell back to, so a signed-in
 * user saw "Sign in / Sign up" on every marketing/platform page regardless
 * of their real auth state.
 */
export function SiteHeader({ session = null }: { session?: Profile | null }) {
  // components/ui/OfflineBanner.tsx docks `fixed inset-x-0 top-0 z-[70]`, the
  // same top edge this header sticks to, at a higher z-index -- it doesn't
  // expose its visibility to consumers, so the header tracks the same
  // online/offline browser events independently and offsets itself below
  // the banner's effectively-constant height (`px-3 py-1.5 text-xs` -> ~28px,
  // i.e. Tailwind's `top-7`) instead of letting the two overlap (review
  // finding, 2026-08-11).
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <header
      className={clsx(
        // Soft glass, but only a bottom edge -- the `.glass` utility boxes all
        // four sides, which is wrong for a full-bleed sticky bar.
        "sticky z-40 border-b border-[var(--glass-edge)] bg-[var(--glass-bg)]",
        "backdrop-blur-[var(--glass-blur)] backdrop-saturate-150",
        "transition-[top] duration-fast ease-out",
        offline ? "top-7" : "top-0",
      )}
    >
      <div className="mx-auto flex h-topbar max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" aria-label="Pepiros home">
          <Logo collapseWordmark />
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

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <MobileNav links={NAV_LINKS} session={session} />
          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                aria-label="Account settings"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface-raised font-mono text-xs text-ink transition-colors duration-fast ease-out hover:border-accent"
              >
                {session.avatarInitials}
              </Link>
              <Link
                href={`/u/${session.username}`}
                className="hidden font-sans text-sm text-ink transition-colors duration-fast ease-out hover:text-accent sm:inline"
              >
                {session.displayName}
              </Link>
            </div>
          ) : (
            <>
              {/* Hidden below sm: the sheet carries these, and three controls
                  plus a hamburger does not fit a 320px header. */}
              <Link
                href="/login"
                className={`${buttonClassName("ghost", "sm")} hidden sm:inline-flex`}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={`${buttonClassName("secondary", "sm")} hidden sm:inline-flex`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
