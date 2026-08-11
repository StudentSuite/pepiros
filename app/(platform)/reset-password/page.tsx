"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * `/reset-password` -- same card pattern as `/login` and `/signup`, one
 * email field. Submit does real client-side validation, then flips local
 * state to a "check your email" confirmation that replaces the form
 * entirely (Task 7 brief) -- no real email is sent, no fetch call.
 */
export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required.");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setSubmitted(true);
  }

  return (
    <main className="flex justify-center px-6 pb-24 pt-20 sm:pt-28">
      <div className="surface-reading paper-grain w-full max-w-sm rounded-lg p-s-6">
        <Logo variant="paper" />

        {submitted ? (
          <div className="mt-6 flex flex-col items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-located/40 bg-located/10 text-located">
              <Icon icon={MailCheck} size="md" />
            </span>
            <h1 className="font-serif text-2xl text-[#1c1a15]">Check your email</h1>
            <p className="font-sans text-sm text-[#1c1a15]/70">
              If an account exists for <span className="font-medium">{email.trim()}</span>, a reset
              link is on its way.
            </p>
            <Link href="/login" className="mt-2 font-sans text-xs underline underline-offset-2 hover:text-accent text-[#1c1a15]/70">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-2xl text-[#1c1a15]">Reset your password</h1>
            <p className="mt-1 font-sans text-sm text-[#1c1a15]/70">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
              <FormField label="Email" required error={error}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" className="mt-2 w-full">
                Send reset link
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
