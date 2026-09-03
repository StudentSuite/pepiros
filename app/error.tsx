"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Route-level error boundary. There was none before, so a thrown error in any
 * page produced Next's default screen.
 *
 * The digest is shown deliberately: it is the only handle someone has when
 * reporting the problem, and it leaks nothing, since the message itself is
 * withheld from the client in production.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[var(--centered-page-min-h)] w-full max-w-md flex-col justify-center p-s-5 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
        Something broke
      </p>
      <h1 className="mt-s-3 font-sans font-bold text-2xl leading-tight text-ink">
        That page did not load.
      </h1>
      <p className="mt-s-3 font-sans text-sm leading-relaxed text-ink-muted">
        The error has been logged. Trying again often works; if it does not, the
        digest below identifies this specific failure.
      </p>

      {error.digest && (
        <p className="mt-s-4 font-mono text-2xs text-ink-faint">
          digest {error.digest}
        </p>
      )}

      <div className="mt-s-6 flex flex-wrap items-center justify-center gap-s-3">
        <button type="button" onClick={reset} className={buttonClassName("primary")}>
          Try again
        </button>
        <Link href="/" className={buttonClassName("secondary")}>
          Back to Pepiros
        </Link>
      </div>
    </main>
  );
}
