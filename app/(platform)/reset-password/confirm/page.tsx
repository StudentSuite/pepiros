"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Card } from "@/components/shadcn/card";

/**
 * Where app/auth/reset-callback/route.ts sends the browser after a real
 * recovery link's code has been exchanged for a Supabase session (that
 * session lives in a cookie set by the callback route, not in anything on
 * this page -- POST /api/auth/reset-password/confirm reads it back
 * server-side). This page only collects the new password.
 *
 * Arriving here without a valid recovery session (the link already used, or
 * this page reached directly) surfaces as the confirm route's own 401 --
 * shown as the same error banner every other failure here uses, not a
 * special-cased state, since the fix is the same either way: request a new
 * link.
 *
 * Issue #126: migrated off `.surface-reading paper-grain` onto the same
 * Card login/signup/reset-password use -- see reset-password/page.tsx's doc
 * comment for why. Issue #131: the 2-second auto-redirect on success had no
 * manual continue and no way to cancel; a manual link now sits alongside it,
 * so hitting back mid-countdown isn't the only way to control what happens
 * next.
 */
export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setError(undefined);
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not reset your password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center p-s-5">
      <Card className="border-border bg-card p-s-6">
        <Logo size="md" />

        {done ? (
          <div className="mt-s-5 flex flex-col items-start gap-s-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-located/40 bg-located/10 text-located">
              <Icon icon={CheckCircle2} size="md" />
            </span>
            <h1 className="font-serif text-2xl text-ink">Password updated</h1>
            <p className="font-sans text-sm text-ink-muted">
              Taking you to sign in with your new password…
            </p>
            <Link href="/login" className="mt-s-1 font-sans text-xs text-ink-faint underline underline-offset-2 hover:text-accent-text">
              Continue now
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-s-5 font-serif text-2xl text-ink">Set a new password</h1>
            <p className="mt-s-1 font-sans text-sm text-ink-muted">
              Choose a new password for your account.
            </p>

            {error && (
              <div className="mt-s-4">
                <ErrorBanner message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-s-5 flex flex-col gap-s-4">
              <FormField label="New password" required>
                <PasswordInput
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </FormField>

              <FormField label="Confirm password" required>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </FormField>

              <Button type="submit" size="lg" className="mt-s-1" disabled={pending}>
                {pending ? "Updating…" : "Update password"}
              </Button>
            </form>

            <p className="mt-s-5 font-sans text-xs text-ink-faint">
              <Link href="/reset-password" className="underline underline-offset-2 hover:text-accent-text">
                Request a new link
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
