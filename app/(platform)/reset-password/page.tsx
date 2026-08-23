"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * `/reset-password` -- same card pattern as `/login` and `/signup` (issue
 * #126: this used to be the one auth screen on `.surface-reading
 * paper-grain`, app/globals.css's own doc comment marks that pattern
 * "LEGACY, FROZEN... do not add new usages," migration target `bg-paper
 * text-ink` -- moved onto the same theme-aware Card the rest of the auth
 * flow already used instead, rather than spreading the frozen pattern to
 * the other two screens). Asks for a username, not an email: that's this
 * app's identifier everywhere else (login, signup), and a user resetting a
 * forgotten password is far more likely to remember their username than
 * which email they gave at signup, if they gave one at all.
 *
 * Posts to a real endpoint (issue #45's follow-up) and always shows the same
 * generic confirmation regardless of the account's actual state -- see
 * lib/data/adapter.ts's requestPasswordReset() doc comment for why a
 * per-account response would be an enumeration risk. This used to flip to a
 * "check your email" state with no fetch call at all, a real request that
 * never went anywhere; that dishonesty is exactly why this app's password
 * reset is real now instead of decorative.
 */
const LINK_ERRORS: Record<string, string> = {
  invalid_link: "That reset link is invalid or has expired. Request a new one below.",
};

function ResetPasswordForm() {
  const params = useSearchParams();
  const linkError = LINK_ERRORS[params.get("error") ?? ""] ?? null;

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | undefined>(linkError ?? undefined);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // Issue #220: the success state replaced the whole form with a new
  // heading, but nothing moved focus there and it wasn't a live region --
  // the previously-focused submit button is removed from the DOM, so a
  // screen-reader/keyboard user's focus silently fell back to <body> with
  // no announcement the request had succeeded.
  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus();
  }, [submitted]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Username is required.");
      return;
    }

    setError(undefined);
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not send a reset link.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
        {submitted ? (
          <div className="mt-s-5 flex flex-col items-start gap-s-3" role="status">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-located/40 bg-located/10 text-located">
              <Icon icon={MailCheck} size="md" />
            </span>
            <h1 ref={successHeadingRef} tabIndex={-1} className="font-sans font-bold text-2xl text-ink outline-none">
              Check your email
            </h1>
            <p className="font-sans text-sm text-ink-muted">
              If <span className="font-medium text-ink">{username.trim()}</span> is an account with a
              recovery email on file, a reset link is on its way there.
            </p>
            <Link href="/login" className="mt-s-2 font-sans text-xs text-ink-faint underline underline-offset-2 hover:text-accent-text">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-s-5 font-sans font-bold text-2xl text-ink">Reset your password</h1>
            <p className="mt-s-1 font-sans text-sm text-ink-muted">
              Enter your username and, if that account has a recovery email on file, we&apos;ll send a
              link to it.
            </p>

            {error && (
              <div className="mt-s-4">
                <ErrorBanner message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-s-5 flex flex-col gap-s-4">
              <FormField label="Username" required>
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="ada"
                  autoComplete="username"
                  required
                />
              </FormField>

              <Button type="submit" size="lg" className="mt-s-1" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </form>

            <p className="mt-s-5 font-sans text-xs text-ink-faint">
              <Link href="/login" className="underline underline-offset-2 hover:text-accent-text">
                Back to sign in
              </Link>
            </p>
          </>
        )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary, same as app/(platform)/login/page.tsx.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
