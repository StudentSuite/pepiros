"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { AuthShell } from "@/components/auth/AuthShell";

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
 *
 * Issue #126/#127: migrated onto components/ui/* to match login and
 * reset-password, gaining FormField's aria-invalid/aria-describedby wiring
 * and per-field errors (collected on submit, not one at a time). Issue
 * #129: added a confirm-password field -- reset-password/confirm already
 * had one; this was the screen most likely to need it (first attempt at a
 * password, no existing value to compare a typo against) and the one
 * missing it.
 */
interface FieldErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function SignupForm() {
  const router = useRouter();
  // Issue #256: carry the destination the visitor was originally headed for
  // through account creation and onboarding, instead of always landing them
  // on /home. Login already honoured `next`; only the signup branch lost it.
  const next = useSearchParams().get("next") || "";
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!displayName.trim()) errors.displayName = "Enter your name.";
    if (!/^[a-z0-9_]{3,30}$/.test(username.trim().toLowerCase())) {
      errors.username = "3-30 characters: lowercase letters, numbers, and underscores only.";
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Enter an email address so you can recover your password later.";
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < 8) errors.password = "Must be at least 8 characters.";
    if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";
    return errors;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, displayName, email: email.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Could not create an account.");
        return;
      }
      router.push(next ? `/onboarding/1?next=${encodeURIComponent(next)}` : "/onboarding/1");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
        <h1 className="mt-s-5 font-sans font-bold text-2xl text-ink">Create an account</h1>
        <p className="mt-s-1 font-sans text-sm text-ink-muted">
          Read with every claim traced back to the sentence it came from.
        </p>

        {formError && (
          <div className="mt-s-4">
            <ErrorBanner message={formError} />
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-s-5 flex flex-col gap-s-4">
          <FormField label="Name" error={fieldErrors.displayName}>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Ada Lovelace"
            />
          </FormField>

          <FormField
            label="Username"
            error={fieldErrors.username}
            hint={fieldErrors.username ? undefined : "Lowercase letters, numbers, and underscores. 3-30 characters."}
          >
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="ada"
            />
          </FormField>

          <FormField
            label="Email"
            error={fieldErrors.email}
            hint={fieldErrors.email ? undefined : "Used to recover your password if you forget it -- never shown to other users."}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="ada@example.com"
            />
          </FormField>

          <FormField
            label="Password"
            error={fieldErrors.password}
            hint={fieldErrors.password ? undefined : "At least 8 characters."}
          >
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </FormField>

          <FormField label="Confirm password" error={fieldErrors.confirmPassword}>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </FormField>

          <Button type="submit" size="lg" className="mt-s-1" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-s-5 font-sans text-xs text-ink-faint">
          Just looking? Sign in as <span className="font-mono text-ink">guest</span> /{" "}
          <span className="font-mono text-ink">guest</span> on the{" "}
          <Link href={loginHref} className="text-accent-text underline underline-offset-2">
            sign-in page
          </Link>{" "}
          instead.
        </p>

        <p className="mt-s-3 font-sans text-[13px] text-ink-faint">
          Already have an account?{" "}
          <Link href={loginHref} className="text-accent-text underline underline-offset-2">
            Sign in
          </Link>
        </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  // useSearchParams needs a Suspense boundary, or the whole route opts out of
  // static rendering. Same shape as login/page.tsx.
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
