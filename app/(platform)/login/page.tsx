"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Card } from "@/components/shadcn/card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

/**
 * Sign in.
 *
 * Unlike the previous version, this posts to a real endpoint and receives a
 * signed httpOnly session cookie. Route protection in middleware.ts depends on
 * it, so "signing in" is no longer decorative.
 *
 * The demo credentials are shown on the page on purpose: this is how a judge or
 * a first-time visitor gets into a populated account without creating one.
 */
/**
 * Reasons /auth/callback can bounce back here. Mapped to plain sentences: a
 * raw provider code in the UI tells a reader nothing they can act on.
 */
const OAUTH_ERRORS: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in did not complete. Try again.",
  google_unavailable:
    "Google sign-in is not configured for this deployment. Use a username and password instead.",
  // Not actually Google-specific (app/auth/callback/route.ts's own SESSION_SECRET
  // check) -- every sign-in path fails the same way when it's unset, so the
  // message says so rather than pointing at Google as the cause.
  auth_not_configured:
    "Sign-in is not configured for this deployment. Contact the site administrator.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A failed Google round-trip arrives as a query param, not as component
  // state, so it has to be read here rather than set by a handler.
  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""] ?? null;
  const error = formError ?? oauthError;
  const setError = setFormError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) return setError("Enter your username.");
    if (!password) return setError("Enter your password.");

    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not sign in.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function useDemo() {
    setUsername("guest");
    setPassword("guest");
    setError(null);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-s-8">
      <Card className="border-border bg-card p-s-6">
        <Logo size="md" />

        <h1 className="mt-s-5 font-serif text-2xl text-ink">Sign in</h1>
        <p className="mt-s-1 font-sans text-sm text-ink-muted">
          Pick up your workspaces and your published papers.
        </p>

        {error && (
          <div className="mt-s-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {/* Google first: it is the path that needs no remembered credential,
            so it belongs above the form rather than as a fallback under it. */}
        <GoogleSignInButton next={next} className="mt-s-5" />

        <div className="my-s-4 flex items-center gap-s-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-s-4">
          <div className="flex flex-col gap-s-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="guest"
            />
          </div>

          <div className="flex flex-col gap-s-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* The demo account is the front door, not a hidden backdoor. */}
        <div className="mt-s-5 rounded-md border border-dashed border-border p-s-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
            Just looking?
          </p>
          <p className="mt-s-2 font-sans text-xs leading-relaxed text-ink-muted">
            Sign in as <span className="font-mono text-ink">guest</span> /{" "}
            <span className="font-mono text-ink">guest</span> to browse a fully
            populated account. Nothing you do there is saved.
          </p>
          <Button variant="outline" size="sm" className="mt-s-3" onClick={useDemo}>
            Use demo credentials
          </Button>
        </div>

        <p className="mt-s-5 font-sans text-xs text-ink-faint">
          New here?{" "}
          <Link href="/signup" className="text-accent-text underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering at build time.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
