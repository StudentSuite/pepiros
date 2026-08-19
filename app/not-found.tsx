import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Global 404 (Task 13). Dark chrome, quiet/honest register -- no red/alert
 * styling, matching the "quote located, not verified" honesty tone rather
 * than a loud error page. Next's convention routes every unmatched route
 * (including `notFound()` calls with no closer boundary, e.g.
 * `/paper/[slug]` on an invalid slug) through this single file.
 *
 * Every other chrome-less full-viewport surface (login, signup, reset
 * password) leads with the brand mark before its heading -- this page was
 * the one dead end that skipped it, going straight from a bare "404" kicker
 * into copy.
 *
 * Copy was "isn't part of the graph" -- graph is the citation-canvas, one
 * feature among several (docs/PLAN-V1.md: the canvas is reached only via an
 * explicit "Explore graph" link, never the default view). It doesn't
 * describe what Pepiros actually is anywhere else on the site. The site's
 * real running metaphor, used on the landing page and in the reader itself,
 * is sourcing/citation: a claim either has a source or it doesn't
 * ("Claims with nothing behind them are labelled inference and carry no
 * citation at all" -- app/(marketing)/page.tsx). A dead link fits that
 * same idea more literally than the graph ever did: this URL has no source.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <LogoMark size="md" />
      <p className="mt-s-2 font-mono text-xs uppercase tracking-widest text-ink-faint">404</p>
      <h1 className="font-serif text-2xl text-ink">This page has no source.</h1>
      <p className="max-w-sm font-sans text-sm text-ink-muted">
        Nothing here to cite, no paper, no workspace. It may have moved or never existed.
      </p>
      <Link href="/" className={buttonClassName("secondary", "sm", "mt-2")}>
        Back to Pepiros
      </Link>
    </main>
  );
}
