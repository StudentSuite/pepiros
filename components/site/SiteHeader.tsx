"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LogOut, Settings, User } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileNav } from "@/components/site/MobileNav";
import { NavMenu, type NavMenuItem } from "@/components/site/NavMenu";
import { SiteSearch } from "@/components/site/SiteSearch";
import { LIVE_TOOLS } from "@/lib/mcp/registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import type { Profile } from "@/lib/data/types";

/**
 * The desktop nav, GitHub-shaped: two headings that open multi-column panels,
 * plus plain links for the two destinations that explain themselves.
 *
 * Every description below is checkable. The MCP tool count is READ from
 * lib/mcp/registry.ts rather than typed here, because that file is the source
 * of truth mcp/tools/index.ts's real registrations are tested against
 * (lib/mcp/registry.test.ts) -- the /mcp page already learned this lesson by
 * hand-maintaining its own copy and drifting from what was actually
 * registered.
 *
 * /open is deliberately absent from the top level (Anay, 2026-08-23): it is a
 * profile, reached the way a profile is. It appears inside the Product panel,
 * which is a link, not a tab.
 */
const NAV_MENU: readonly NavMenuItem[] = [
  {
    label: "Product",
    sections: [
      {
        title: "Understand it",
        items: [
          {
            href: "/how-it-works",
            label: "How it works",
            description: "The claim, the beam, and the sentence it came from.",
          },
          {
            href: "/how-to-use",
            label: "Guide",
            description: "From a PDF to a summary you can check.",
          },
          {
            href: "/mcp",
            label: "For agents",
            description: `${LIVE_TOOLS.length} MCP tools, so an agent can check its own output.`,
          },
        ],
      },
      {
        title: "Read it",
        items: [
          {
            href: "/discover",
            label: "Discover",
            description: "Open-access papers, read closely.",
          },
          {
            href: "/open",
            label: "Open catalog",
            description: "Every paper Pepiros has indexed.",
          },
          {
            href: "/upload",
            label: "Add a paper",
            description: "Paste a link, a DOI, or upload a PDF.",
          },
        ],
      },
    ],
  },
  {
    label: "Resources",
    sections: [
      {
        title: "Reference",
        items: [
          { href: "/docs", label: "Docs", description: "How the pieces fit together." },
          { href: "/faq", label: "FAQ", description: "The questions people actually ask." },
          {
            href: "/security",
            label: "Security",
            description: "What we store, and how to report a problem.",
          },
        ],
      },
      {
        title: "Project",
        items: [
          { href: "/changelog", label: "Changelog", description: "What shipped, and when." },
          { href: "/roadmap", label: "Roadmap", description: "What is next, and what is not." },
          { href: "/status", label: "Status", description: "Whether it is up right now." },
        ],
      },
    ],
  },
  { label: "Discover", href: "/discover" },
  { label: "About", href: "/about" },
];

/**
 * The mobile sheet is a flat list, not a mega menu: a panel-within-a-drawer
 * buys nothing on a phone. These two arrays flatten NAV_MENU so the sheet and
 * the desktop nav cannot list different destinations.
 */
const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/how-to-use", label: "Guide" },
  { href: "/mcp", label: "For agents" },
  { href: "/discover", label: "Discover" },
  { href: "/open", label: "Open catalog" },
  { href: "/about", label: "About" },
] as const;

/** Issue #121: otherwise reachable only via a footer scroll below `lg`. */
const SECONDARY_NAV_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
  { href: "/security", label: "Security" },
  { href: "/status", label: "Status" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/changelog", label: "Changelog" },
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
  // the banner's height (`px-3 py-1.5 text-xs` -> ~28px, i.e. Tailwind's
  // `top-7`) instead of letting the two overlap (review finding,
  // 2026-08-11). Issue #277: this only holds because OfflineBanner's own
  // text is `truncate`d to one line -- without that, its ~60-char copy wraps
  // to two lines on narrow phones (<=~380px), making the real banner ~2x
  // taller than this hardcoded offset assumes.
  const [offline, setOffline] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Same call the app sidebar's menu makes. Until now that sidebar and
  // /settings/security were the only two places a signed-in user could sign
  // out, so anyone reading on /, /discover or a paper page had to navigate
  // into the app shell first just to leave.
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  // Issue #128: a signed-out visitor already on /login saw a live "Sign in"
  // link pointing at the page they're on, plus 5 nav links that only add
  // distraction to a flow that should minimize it.
  const isAuthPage = pathname === "/login" || pathname === "/signup";

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

        {!isAuthPage && (
          <nav aria-label="Main">
            <NavMenu items={NAV_MENU} />
          </nav>
        )}

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Hidden below md: at phone widths the field would crowd out the
              wordmark and the account menu, and the mobile sheet is the right
              home for it there. Given a fixed basis rather than flex-1 so it
              cannot squeeze the nav as the viewport narrows. */}
          {!isAuthPage && <SiteSearch className="hidden w-56 md:block lg:w-64" />}
          <ThemeToggle />
          {!isAuthPage && (
            <MobileNav links={NAV_LINKS} secondaryLinks={SECONDARY_NAV_LINKS} session={session} />
          )}
          {isAuthPage ? null : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full outline-none focus-visible:shadow-glow-accent"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface-raised font-mono text-xs text-ink transition-colors duration-fast ease-out hover:border-accent">
                  {session.avatarInitials}
                </span>
                <span className="hidden font-sans text-sm text-ink lg:inline">
                  {session.displayName}
                </span>
              </DropdownMenuTrigger>
              {/*
                sideOffset is load-bearing, not cosmetic. Without a gap the
                menu renders flush under the pointer, so the same click that
                opens it lands on the first item and navigates immediately.
              */}
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/u/${session.username}`}>
                    <User className="size-4" />
                    Your profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="size-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {/* Hidden below lg: the sheet carries these. Five nav labels
                  plus two buttons plus the theme toggle wrap mid-word between
                  640-1023px (tablet), so the hamburger now owns that whole
                  range too, not just phone widths. */}
              <Link
                href="/login"
                className={`${buttonClassName("ghost", "sm")} hidden lg:inline-flex`}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={`${buttonClassName("secondary", "sm")} hidden lg:inline-flex`}
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
