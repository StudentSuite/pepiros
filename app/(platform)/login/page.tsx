"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * Sign in.
 *
 * Unlike the previous version, this posts to a real endpoint and receives a
 * signed httpOnly session cookie. Route protection in middleware.ts depends on
 * it, so "signing in" is no longer decorative.
 *
 * The demo credentials are shown on the page on purpose: this is how a judge or
 * a first-time visitor gets into a populated account without creating one.
 *
 * Issue #126: was on components/shadcn/{input,label,button} while
 * reset-password used components/ui/*, which already had the accessibility
 * wiring (FormField's aria-invalid/aria-describedby) this page lacked --
 * standardized on components/ui/* here to match, closing #127 as the same
 * move. Issue #132/#129/#133 folded in below: 44px primary CTA, a password
 * visibility toggle, and "Use demo credentials" now actually signs in
 * instead of silently filling two fields and waiting for a second click.
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

interface FieldErrors {
  username?: string;
  password?: string;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A failed Google round-trip arrives as a query param, not as component
  // state, so it has to be read here rather than set by a handler.
  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""] ?? null;
  const error = formError ?? oauthError;
  // Set by createAccount()'s emailRedirectTo (issue #84) once Supabase's own
  // confirmation link is clicked.
  const confirmed = params.get("confirmed") === "1";

  // Issue #127: validates every field and collects every error before the
  // first submit, rather than one at a time (fix username, resubmit, hit
  // the password error, resubmit again).
  function validate(u: string, p: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!u.trim()) errors.username = "Enter your username.";
    if (!p) errors.password = "Enter your password.";
    return errors;
  }

  async function attemptSignIn(u: string, p: string) {
    setFormError(null);
    const errors = validate(u, p);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Could not sign in.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void attemptSignIn(username, password);
  }

  // Issue #133: used to only fill the fields and wait for a second click on
  // "Sign in," with no indication a second step was needed. Signs in
  // directly now -- one click, matching what a reader expects a button
  // labeled "Use demo credentials" to actually do.
  function useDemo() {
    setUsername("guest");
    setPassword("guest");
    void attemptSignIn("guest", "guest");
  }

  return (
    <AuthShell>
        <h1 className="mt-s-5 font-sans font-bold text-2xl text-ink">Sign in</h1>
        <p className="mt-s-1 font-sans text-sm text-ink-muted">
          Pick up your workspaces and your published papers.
        </p>

        {error && (
          <div className="mt-s-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {!error && confirmed && (
          <p className="mt-s-4 rounded-md border border-located/50 bg-located/10 px-s-3 py-s-2 font-sans text-sm text-ink">
            Email confirmed. Sign in below.
          </p>
        )}

        {/* Google first: it is the path that needs no remembered credential,
            so it belongs above the form rather than as a fallback under it. */}
        <GoogleSignInButton next={next} className="mt-s-5" />

        <div className="my-s-4 flex items-center gap-s-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-s-4">
          <FormField label="Username" error={fieldErrors.username}>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="guest"
            />
          </FormField>

          <FormField
            label="Password"
            error={fieldErrors.password}
            labelSuffix={
              <Link
                href="/reset-password"
                className="font-sans text-xs text-ink-faint underline underline-offset-2 hover:text-accent-text"
              >
                Forgot password?
              </Link>
            }
          >
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </FormField>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* The demo account is the front door, not a hidden backdoor. Gap
            (mt-s-5, was mt-s-3 from the form above) keeps this away from
            "Forgot password?" directly above -- issue #132, two small tap
            targets sat close together on a form-heavy mobile flow. */}
        <div className="mt-s-5 rounded-md border border-dashed border-border p-s-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
            Just looking?
          </p>
          <p className="mt-s-2 font-sans text-xs leading-relaxed text-ink-muted">
            Sign in as <span className="font-mono text-ink">guest</span> /{" "}
            <span className="font-mono text-ink">guest</span> to browse a fully
            populated account. Nothing you do there is saved.
          </p>
          <Button variant="secondary" size="sm" className="mt-s-3" onClick={useDemo} disabled={pending}>
            Use demo credentials
          </Button>
        </div>

        <p className="mt-s-5 font-sans text-xs text-ink-faint">
          New here?{" "}
          {/* Issue #256: this was a bare /signup, so a visitor sent here from
              a protected page kept their destination only if they already had
              an account. Picking the other path silently dropped it and they
              finished onboarding on /home with no memory of where they were
              going. */}
          <Link
            href={next === "/home" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`}
            className="text-accent-text underline underline-offset-2"
          >
            Create an account
          </Link>
        </p>
    </AuthShell>
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
