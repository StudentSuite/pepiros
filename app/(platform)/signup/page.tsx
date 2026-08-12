"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string; password?: string };

/**
 * `/signup` -- same card/validation/submit pattern as `/login` (Task 7
 * brief), plus a name field over login's email+password. Client-side
 * validation only, submit never calls fetch, pretend-success
 * `router.push("/workspaces")`.
 */
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required.";
    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
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

        <h1 className="mt-6 font-serif text-2xl text-[#1c1a15]">Create an account</h1>
        <p className="mt-1 font-sans text-sm text-[#1c1a15]/70">
          Start reading with every claim traced back to its source.
        </p>

        {/* FormField's label/error text hardcodes text-ink-muted/text-unsupported,
            calibrated for dark chrome, not this .surface-reading card -- both fail
            WCAG AA here (label ~2.27:1, error ~3.57:1 against --paper). FormField
            itself is off-limits (Global Constraints: reuse as-is), so the override
            targets the generated classes by descendant selector instead: #4a4740
            for the label (~8.2:1) and #7a3535 for the error (~7.8:1), both against
            --paper #f5f1e8. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 flex flex-col gap-4 [&_.text-ink-muted]:!text-[#4a4740] [&_.text-unsupported]:!text-[#7a3535]"
        >
          <FormField label="Name" required error={errors.name}>
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
              required
            />
          </FormField>

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

          <FormField label="Password" required error={errors.password} hint="At least 8 characters.">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </FormField>

          <Button type="submit" variant="primary" className="mt-2 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 font-sans text-xs text-[#1c1a15]/70">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
