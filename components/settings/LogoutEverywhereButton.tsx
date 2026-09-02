"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";

/**
 * Issue #85: revokes every session for this account, not just this device's.
 *
 * Issue #203: this used to fire on click with no confirmation, unlike every
 * other destructive action in settings (DangerZone's account deletion,
 * McpTokens' revoke) -- a misclick instantly force-logged-out the current
 * session plus every other device with no warning and no undo. Now behind
 * the same AlertDialog confirmation pattern.
 */
export function LogoutEverywhereButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/logout-everywhere", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not sign out other devices.");
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" className="gap-1.5" onClick={() => setOpen(true)}>
        <ShieldOff className="size-4" />
        Sign out everywhere
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
            <AlertDialogDescription>
              This signs out this device plus every other device currently signed in to your
              account. You&rsquo;ll need to sign in again on all of them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirm}>
              {pending ? "Signing out everywhere…" : "Sign out everywhere"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
