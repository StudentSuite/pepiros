"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

/**
 * Sign up.
 *
 * Account creation is not implemented, and this page says so rather than
 * validating, showing a success state, and pushing to an auth-gated route that
 * bounces the person straight back to /login. That is what it used to do.
 *
 * Until there is a real endpoint, the honest offer is the demo account, which
 * is a complete populated account anyone can open immediately.
 */
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(
      "Sign-up is not open yet, so nothing was created. Sign in as guest / guest to look around a full account in the meantime.",
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-s-8">
      <Logo size="md" />

      <h1 className="mt-s-6 font-serif text-[1.9rem] leading-tight text-ink">
        Create an account
      </h1>
      <p className="mt-s-3 font-sans text-[15px] leading-relaxed text-ink-muted">
        Read with every claim traced back to the sentence it came from.
      </p>

      <div className="mt-s-6 rounded-md border border-dashed border-border p-s-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Not open yet
        </p>
        <p className="mt-s-2 font-sans text-[14px] leading-relaxed text-ink-muted">
          Accounts are not being created while Pepiros is an early build. The
          demo account is a complete, populated account and needs no signup.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-s-3">
          <Link href="/login">Open the demo account</Link>
        </Button>
      </div>

      {notice && (
        <div className="mt-s-5">
          <ErrorBanner message={notice} variant="warn" />
        </div>
      )}

      <form onSubmit={submit} className="mt-s-6 flex flex-col gap-s-4">
        <div className="flex flex-col gap-s-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <p className="font-sans text-[13px] text-ink-faint">
            Leave your address and we will tell you when accounts open. Nothing
            is stored yet, so this currently does nothing.
          </p>
        </div>

        <Button type="submit" variant="secondary">
          Notify me
        </Button>
      </form>

      <p className="mt-s-6 font-sans text-[13px] text-ink-faint">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </main>
  );
}
