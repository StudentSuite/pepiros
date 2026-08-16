"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

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
    <main className="flex justify-center px-6 pb-24 pt-20 sm:pt-28">
      <div className="surface-reading paper-grain w-full max-w-sm rounded-lg p-s-6">
        <Logo variant="paper" />

        {done ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-located/40 bg-located/10 text-located">
              <Icon icon={CheckCircle2} size="md" />
            </span>
            <h1 className="font-serif text-2xl text-[#1c1a15]">Password updated</h1>
            <p className="font-sans text-sm text-[#1c1a15]/70">
              Taking you to sign in with your new password…
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-2xl text-[#1c1a15]">Set a new password</h1>
            <p className="mt-1 font-sans text-sm text-[#1c1a15]/70">
              Choose a new password for your account.
            </p>

            {error && (
              <div className="mt-4">
                <ErrorBanner message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
              <FormField label="New password" required>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </FormField>

              <FormField label="Confirm password" required>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" className="mt-2 w-full" disabled={pending}>
                {pending ? "Updating…" : "Update password"}
              </Button>
            </form>

            <p className="mt-6 font-sans text-xs text-[#1c1a15]/70">
              <Link href="/reset-password" className="underline underline-offset-2 hover:text-accent">
                Request a new link
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
