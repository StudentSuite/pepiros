import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";

// Issue #248: renamed from "Product"/"Project", which differed by one
// letter and gave a reader no way to predict which held Docs vs FAQ. "Read"
// groups what a reader consumes to use the product.
const READ_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/how-to-use", label: "Guide" },
  { href: "/docs", label: "Docs" },
  { href: "/mcp", label: "For agents" },
] as const;

const PROJECT_LINKS = [
  { href: "/status", label: "Status" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/changelog", label: "Changelog" },
  { href: "/faq", label: "FAQ" },
] as const;

// Issue #248: was "Connect", mixing About/Contact in with the legal pages --
// renamed to Legal now that About/Contact sit beside the brand instead.
//
// No mailto: link -- no contact address is referenced anywhere in the repo
// (README.md, SECURITY.md, CONTRIBUTING.md all checked), and the brief says
// omit rather than invent one. No GitHub link either: a repo URL does
// appear in README.md's badges/clone command, but CLAUDE.md's project
// context states the repo is private through submission, and Task 5's brief
// explicitly warns against linking a private repo as if it were public --
// applying that same reasoning here rather than one rule for the footer and
// another for /about.
const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/security", label: "Security" },
  { href: "/legal#license", label: "License" },
] as const;

/**
 * Site chrome footer, shared by the `(marketing)` and `(platform)` route
 * groups. 4-column grid (Brand+About/Contact / Read / Project / Legal) over
 * a bottom strip with the project's origin note, the open-access data note,
 * and the license line -- see inline comments below for where each fact is
 * sourced.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo tagline size="md" />
          {/* Issue #241/#248: was a restatement of the old hero paragraph,
              word for word -- the footer's brand blurb should not be the
              second place the same rewrite shows up. */}
          <p className="max-w-xs font-sans text-sm text-ink-faint">
            Every claim, one click from its source.
          </p>
          {/* Issue #248: About/Contact used to sit in the "Connect" column
              at the same weight as Privacy/Terms. About is repeated here
              (not just in SiteHeader's nav) because the nav is `hidden`
              below the `sm` breakpoint -- without this, /about would be
              completely unreachable on narrow viewports (review finding,
              2026-08-11). */}
          <div className="flex gap-4 font-sans text-sm text-ink-muted">
            <Link href="/about" className="transition-colors duration-fast ease-out hover:text-ink">
              About
            </Link>
            <Link href="/contact" className="transition-colors duration-fast ease-out hover:text-ink">
              Contact
            </Link>
          </div>
          {/* Issue #248: "Try the demo" used to be the sixth item in the
              Product list, at the same weight as License -- the footer had
              no call to action anywhere. Straight to the reader: /w is open
              to guests, so routing through /login would ask for
              credentials this no longer needs. */}
          <Link href="/w/ws-1" className={buttonClassName("primary", "sm", "self-start")}>
            Try the demo
          </Link>
        </div>

        <FooterColumn title="Read" links={READ_LINKS} />
        <FooterColumn title="Project" links={PROJECT_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-6 font-sans text-xs text-ink-faint">
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
      {/* Issue #248: 9px mono column heads read as decoration rather than
          navigation -- one size and one contrast step up. */}
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">{title}</p>
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
