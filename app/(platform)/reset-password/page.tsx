"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

/**
 * `/reset-password` -- same card pattern as `/login` and `/signup`. Asks for
 * a username, not an email: that's this app's identifier everywhere else
 * (login, signup), and a user resetting a forgotten password is far more
 * likely to remember their username than which email they gave at signup,
 * if they gave one at all.
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
    <main className="mx-auto flex min-h-[70vh] w-full flex-col justify-center p-s-5">
      <div className="surface-reading paper-grain w-full max-w-sm rounded-lg p-s-6">
        <Logo variant="paper" />

        {submitted ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-located/40 bg-located/10 text-located">
              <Icon icon={MailCheck} size="md" />
            </span>
            <h1 className="font-serif text-2xl text-[#1c1a15]">Check your email</h1>
            <p className="font-sans text-sm text-[#1c1a15]/70">
              If <span className="font-medium">{username.trim()}</span> is an account with a recovery
              email on file, a reset link is on its way there.
            </p>
            <Link href="/login" className="mt-2 font-sans text-xs underline underline-offset-2 hover:text-accent text-[#1c1a15]/70">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-2xl text-[#1c1a15]">Reset your password</h1>
            <p className="mt-1 font-sans text-sm text-[#1c1a15]/70">
              Enter your username and, if that account has a recovery email on file, we&apos;ll send a
              link to it.
            </p>

            {error && (
              <div className="mt-4">
                <ErrorBanner message={error} />
              </div>
            )}

            {/* FormField's label/error contrast on this paper card is handled by
                the scoped `.surface-reading` cascade rule in app/globals.css. */}
            <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
              <FormField label="Username" required>
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="ada"
                  autoComplete="username"
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" className="mt-2 w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </form>

            <p className="mt-6 font-sans text-xs text-[#1c1a15]/70">
              <Link href="/login" className="underline underline-offset-2 hover:text-accent">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
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
