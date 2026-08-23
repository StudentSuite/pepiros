"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Issue #136: app/(app) had no error.tsx of its own, so a thrown error here
 * fell through to the root app/error.tsx -- rendered above
 * app/(app)/layout.tsx, so it unmounted the whole AppSidebar and its only
 * recovery link ("Back to Pepiros") went to the marketing homepage, exiting
 * the app entirely rather than routing back into it. Placed here instead,
 * Next renders this only in the layout's {children} slot (sidebar stays
 * put), and the recovery link goes to /home, not out of the app.
 */
export default function AppError({
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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center p-s-5 text-center">
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
        <p className="mt-s-4 font-mono text-[11px] text-ink-faint">
          digest {error.digest}
        </p>
      )}

      <div className="mt-s-6 flex flex-wrap items-center justify-center gap-s-3">
        <button type="button" onClick={reset} className={buttonClassName("primary")}>
          Try again
        </button>
        <Link href="/home" className={buttonClassName("secondary")}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
