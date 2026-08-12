import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Global 404 (Task 13). Dark chrome, quiet/honest register -- no red/alert
 * styling, matching the "quote located, not verified" honesty tone rather
 * than a loud error page. Next's convention routes every unmatched route
 * (including `notFound()` calls with no closer boundary, e.g.
 * `/paper/[slug]` on an invalid slug) through this single file.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">404</p>
      <h1 className="font-serif text-2xl text-ink">This page isn&apos;t part of the graph.</h1>
      <p className="max-w-sm font-sans text-sm text-ink-muted">
        Nothing here, no paper, no workspace. It may have moved or never existed.
      </p>
      <Link href="/" className={buttonClassName("secondary", "sm", "mt-2")}>
        Back to Pepiros
      </Link>
    </main>
  );
}
