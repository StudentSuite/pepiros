"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Card } from "@/components/shadcn/card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign up. Posts to a real endpoint (POST /api/auth/signup ->
 * lib/data/adapter.ts's createAccount()) and receives the same signed
 * session cookie login does, rather than validating input, creating
 * nothing, and pushing to an auth-gated route.
 *
 * On a deployment with no Supabase project configured (PEPIROS_PLATFORM_
 * BACKEND unset), createAccount() returns an honest error instead of a fake
 * account -- the form still works, it just surfaces that error rather than
 * a made-up success.
 *
 * Email is required (issue #83): it used to be optional (issue #45),
 * falling back to a synthetic placeholder that could never receive mail --
 * which meant an account created without one had no way to ever recover a
 * lost password, while /reset-password's UI still claimed success. Required
 * now, so every account has somewhere real for that flow to send to.
 */
export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) return setError("Enter your name.");
    if (!/^[a-z0-9_]{3,30}$/.test(username.trim().toLowerCase())) {
      return setError("Usernames are 3-30 characters: lowercase letters, numbers, and underscores only.");
    }
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError("Enter an email address so you can recover your password later.");
    if (!EMAIL_RE.test(trimmedEmail)) {
      return setError("Enter a valid email address.");
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, displayName, email: trimmedEmail }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not create an account.");
        return;
      }
      router.push("/onboarding/1");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center p-s-5">
      <Card className="border-border bg-card p-s-6">
        <Logo size="md" />

        <h1 className="mt-s-5 font-serif text-2xl text-ink">Create an account</h1>
        <p className="mt-s-1 font-sans text-sm text-ink-muted">
          Read with every claim traced back to the sentence it came from.
        </p>

        {error && (
          <div className="mt-s-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={submit} className="mt-s-5 flex flex-col gap-s-4">
          <div className="flex flex-col gap-s-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Ada Lovelace"
            />
          </div>

          <div className="flex flex-col gap-s-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="ada"
            />
            <p className="font-sans text-[13px] text-ink-faint">
              Lowercase letters, numbers, and underscores. 3-30 characters.
            </p>
          </div>

          <div className="flex flex-col gap-s-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="ada@example.com"
            />
            <p className="font-sans text-[13px] text-ink-faint">
              Used to recover your password if you forget it -- never shown to other users.
            </p>
          </div>

          <div className="flex flex-col gap-s-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <p className="font-sans text-[13px] text-ink-faint">At least 8 characters.</p>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-s-5 font-sans text-xs text-ink-faint">
          Just looking? Sign in as <span className="font-mono text-ink">guest</span> /{" "}
          <span className="font-mono text-ink">guest</span> on the{" "}
          <Link href="/login" className="text-accent-text underline underline-offset-2">
            sign-in page
          </Link>{" "}
          instead.
        </p>

        <p className="mt-s-3 font-sans text-[13px] text-ink-faint">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-text underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
