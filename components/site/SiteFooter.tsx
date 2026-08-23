import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Site chrome footer, shared by the `(marketing)` and `(platform)` route
 * groups.
 *
 * Shape is GitHub's: a brand block, four columns of links under mono uppercase
 * headings, then a bottom bar carrying copyright, the legal links, and social
 * marks. Density comes from real destinations, not padding -- every href below
 * resolves to a route that exists in this repo, which is why /discover and
 * /open now appear here (both were reachable only from the nav before) and why
 * there is no fifth column: there is no fifth column's worth of true links.
 *
 * TWO DELIBERATE OMISSIONS, both matching the approved plan (§6.2):
 *
 *   No language selector. GitHub has one because GitHub is localised. This app
 *   has no i18n of any kind, so the control would be a dropdown with one entry
 *   that changes nothing. On a product whose entire argument is that it says
 *   "quote located" instead of "verified", shipping chrome that implies a
 *   capability it does not have is the wrong trade for looking complete.
 *
 *   No newsletter form. Same reason: there is no list to join.
 */

const PRODUCT_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/how-to-use", label: "Guide" },
  { href: "/discover", label: "Discover" },
  { href: "/open", label: "Open catalog" },
  { href: "/mcp", label: "For agents" },
] as const;

const RESOURCE_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
  { href: "/changelog", label: "Changelog" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/status", label: "Status" },
] as const;

const PROJECT_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/security", label: "Security" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/legal#license", label: "License" },
] as const;

/** The bottom bar's inline legal row, GitHub-style, beside the copyright. */
const BOTTOM_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/status", label: "Status" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * The public repository URL, or null while there is not one.
 *
 * package.json declares github.com/StudentSuite/pepiros, but the repo is
 * PRIVATE through submission (CLAUDE.md), and a social icon pointing at a 404
 * is worse than no icon: it reads as a dead project rather than a closed one.
 *
 * This is the single switch. Set it to the repo URL the day it goes public and
 * the mark appears in the bottom bar; nothing else needs touching. Same
 * reasoning the /about page already applies, kept in one place rather than
 * decided twice.
 */
const PUBLIC_REPO_URL: string | null = null;

/**
 * Social marks, rendered only where a real account exists.
 *
 * Deliberately derived rather than hand-written: an empty list renders nothing
 * at all, so the row cannot end up showing a placeholder. The brand kit ships
 * discord/linkedin/twitter cards in anticipation of those accounts, but
 * anticipating an account is not having one, and a footer is not the place to
 * find that out.
 */
const SOCIAL_LINKS: ReadonlyArray<{ href: string; label: string; icon: React.ReactNode }> = [
  ...(PUBLIC_REPO_URL
    ? [
        {
          href: PUBLIC_REPO_URL,
          label: "Pepiros on GitHub",
          icon: (
            <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          ),
        },
      ]
    : []),
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo tagline size="md" />
            {/* A description, NOT a second tagline: <Logo tagline> directly
                above already prints the live one, and this slot previously
                carried a retired tagline underneath it, so the footer showed
                two competing ones stacked. */}
            <p className="max-w-xs font-sans text-sm text-ink-faint">
              A publishing platform for researchers, with a summariser you can
              check.
            </p>
            {/* /w is open to guests, so this goes straight to the reader
                rather than routing through /login for credentials it does not
                need. */}
            <Link href="/w/ws-1" className={buttonClassName("primary", "sm", "self-start")}>
              Try the demo
            </Link>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
          <FooterColumn title="Project" links={PROJECT_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 font-sans text-xs text-ink-faint sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            {/* Copyright holders per LICENSE:3 and README.md's own license
                footer. The product name is not the copyright holder. Year is
                computed, not written down, so it cannot go stale. */}
            <span>
              &copy; {new Date().getFullYear()} Anay Dhawan and Yash Kewlani
            </span>
            <span aria-hidden className="hidden sm:inline text-ink-faint/50">
              &middot;
            </span>
            <span>MIT</span>
            {BOTTOM_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors duration-fast ease-out hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {SOCIAL_LINKS.length > 0 && (
            <ul className="flex items-center gap-s-4">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex text-ink-faint transition-colors duration-fast ease-out hover:text-ink"
                  >
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open-access-only data note: docs/PLAN-V1.md §22.2. Uploads stay
            private to the uploader's workspace unless the licence permits
            listing them in the public catalog. Kept on its own line under the
            bar because it is a commitment, not a link. */}
        <div className="mx-auto max-w-6xl px-6 pb-6 font-sans text-xs text-ink-faint">
          Uploaded papers stay private to your workspace unless they&apos;re open-access or
          CC-licensed.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="kicker">{title}</p>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-sans text-sm text-ink-muted transition-colors duration-fast ease-out hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
