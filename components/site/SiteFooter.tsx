import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const PRODUCT_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/mcp", label: "For agents" },
  { href: "/docs", label: "Docs" },
  { href: "/discover", label: "Discover" },
  // /workspaces is behind middleware, so a signed-out visitor clicking this
  // used to land on /login with no explanation. Route through login, which
  // shows the guest credentials, and carry them to the reader afterwards.
  { href: "/login?next=%2Fw%2Fws-1", label: "Try the demo" },
] as const;

const PROJECT_LINKS = [
  { href: "/status", label: "Status" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/changelog", label: "Changelog" },
  { href: "/faq", label: "FAQ" },
] as const;

// No mailto: link -- no contact address is referenced anywhere in the repo
// (README.md, SECURITY.md, CONTRIBUTING.md all checked), and the brief says
// omit rather than invent one. No GitHub link either: a repo URL does
// appear in README.md's badges/clone command, but CLAUDE.md's project
// context states the repo is private through submission, and Task 5's brief
// explicitly warns against linking a private repo as if it were public --
// applying that same reasoning here rather than one rule for the footer and
// another for /about.
//
// About is listed here (not just in SiteHeader's nav) because the nav is
// `hidden` below the `sm` breakpoint -- without this, /about would be
// completely unreachable on narrow viewports (review finding, 2026-08-11).
const CONNECT_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/security", label: "Security" },
  { href: "/legal#license", label: "License" },
] as const;

/**
 * Site chrome footer, shared by the `(marketing)` and `(platform)` route
 * groups. 4-column grid (Brand / Product / Platform / Connect) over a bottom
 * strip with the project's origin note, the open-access data note, and the
 * license line -- see inline comments below for where each fact is sourced.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Logo tagline size="md" />
          <p className="max-w-xs font-sans text-sm text-ink-faint">
            Substack for researchers, with a summariser you can check. Every
            claim stays bound to the sentence it came from.
          </p>
        </div>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Project" links={PROJECT_LINKS} />
        <FooterColumn title="Connect" links={CONNECT_LINKS} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-6 font-sans text-xs text-ink-faint">
          {/* Hackathon-origin note: plan.md's header ("Hackathon: Aug 7-19,
              2026 ... Team: Anay + Yash") plus README.md's own "Early build,
              moving fast" framing and SECURITY.md's "small, active hackathon
              project" line -- no wording invented beyond what those already say. */}
          <p>Pepiros started as a hackathon project and is still an early build, moving fast.</p>
          {/* Open-access-only data note: docs/PLAN-V1.md §22.2 -- uploads
              stay private to the uploader's workspace unless the license
              permits listing them in the public catalog. */}
          <p>
            Uploaded papers stay private to your workspace unless they&apos;re open-access or
            CC-licensed.
          </p>
          {/* Copyright holders per LICENSE:3 ("Copyright (c) 2026 Anay Dhawan
              and Yash Kewlani") and README.md's own license footer -- the
              product name "Pepiros" is not the copyright holder. */}
          <p>
            &copy; {new Date().getFullYear()} Anay Dhawan and Yash Kewlani &middot; MIT
          </p>
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
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{title}</p>
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
