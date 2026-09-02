"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/**
 * Issue #217: this used to have no pending state and no error handling,
 * unlike its sibling LogoutEverywhereButton -- a slow network invited a
 * double-click sending duplicate requests, and a failed/offline fetch still
 * unconditionally navigated away as if sign-out had succeeded, even though
 * the session cookie could still be live.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not sign out. Try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="secondary" className="gap-1.5" disabled={pending} onClick={() => void run()}>
      <LogOut className="size-4" />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
