"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";

/**
 * Real password change (POST /api/auth/change-password) for the currently
 * signed-in account -- app/(app)/settings/security/page.tsx used to just
 * say "Not available yet" here unconditionally, which stopped being fully
 * true once #64 built a real password-reset flow. That flow needs an
 * emailed recovery link, though; this is the more direct "I know my
 * current password, I just want a new one" path a settings page should
 * also offer, and needs no recovery email at all since the active session
 * is itself the proof of authentication.
 */
export function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

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
      toast.success("Password updated");
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-s-3">
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        placeholder="New password"
        aria-label="New password"
      />
      <Input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        placeholder="Confirm new password"
        aria-label="Confirm new password"
      />
      <Button type="submit" size="sm" disabled={saving || !password || !confirmPassword} className="self-start">
        {saving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
