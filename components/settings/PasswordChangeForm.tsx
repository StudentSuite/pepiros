"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

/**
 * Real password change (POST /api/auth/change-password) for the currently
 * signed-in account -- app/(app)/settings/security/page.tsx used to just
 * say "Not available yet" here unconditionally, which stopped being fully
 * true once #64 built a real password-reset flow. That flow needs an
 * emailed recovery link, though; this is the more direct "I know my
 * current password, I just want a new one" path a settings page should
 * also offer, and needs no recovery email at all since the active session
 * is itself the proof of authentication.
 *
 * Issue #204: validation used to be a toast.error() call only, unlike every
 * other password form in the app (login, signup, reset-password/confirm),
 * which use FormField's persistent inline error + aria-invalid/
 * aria-describedby. A toast auto-dismisses in a few seconds, leaving two
 * populated fields with no visible indication of what was wrong or which
 * field to fix.
 */
export function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (password.length < 8) errors.password = "Must be at least 8 characters.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Could not update your password.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      toast.success("Password updated");
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-s-3">
      <FormField label="New password" error={fieldErrors.password}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="New password"
        />
      </FormField>
      <FormField label="Confirm new password" error={fieldErrors.confirmPassword}>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Confirm new password"
        />
      </FormField>
      <Button type="submit" variant="primary" size="sm" disabled={saving || !password || !confirmPassword} className="self-start">
        {saving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
