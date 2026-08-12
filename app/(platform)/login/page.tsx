"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

/**
 * `/login` -- client component (form state + router.push). Centered
 * `.surface-reading .paper-grain` card on the dark chrome (Task 7 brief).
 * Validation is real (required + email-shape) but purely client-side: submit
 * never calls fetch, it's a pretend-success `router.push("/workspaces")`
 * (Global Constraints -- no real auth backend in this build).
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    router.push("/workspaces");
  }

  return (
    <main className="flex justify-center px-6 pb-24 pt-20 sm:pt-28">
      <div className="surface-reading paper-grain w-full max-w-sm rounded-lg p-s-6">
        <Logo variant="paper" />

        <h1 className="mt-6 font-serif text-2xl text-[#1c1a15]">Sign in</h1>
        <p className="mt-1 font-sans text-sm text-[#1c1a15]/70">
          Welcome back. Sign in to open your workspaces.
        </p>

        {/* FormField's label/error contrast on this paper card is handled by
            the scoped `.surface-reading` cascade rule in app/globals.css. */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <FormField label="Email" required error={errors.email}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </FormField>

          <FormField label="Password" required error={errors.password}>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </FormField>

          <Button type="submit" variant="primary" className="mt-2 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 font-sans text-xs text-[#1c1a15]/70">
          <Link href="/reset-password" className="underline underline-offset-2 hover:text-accent">
            Forgot your password?
          </Link>
        </p>
        <p className="mt-2 font-sans text-xs text-[#1c1a15]/70">
          New here?{" "}
          <Link href="/signup" className="underline underline-offset-2 hover:text-accent">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
