"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
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
 * Destructive account deletion (issue #75).
 *
 * "Delete this workspace" used to sit here too, but there is no data model
 * linking a signed-in account to any grounding-domain workspace at all --
 * profiles/posts (Supabase platform schema) and workspaces/nodes (Drizzle
 * grounding schema) are deliberately separate, sharing only a paper id
 * (supabase/migrations/0001_platform.sql's own header comment), and
 * /workspaces is already known-mocked data (issue #91). There was nothing
 * real for that row to delete, so it's gone until #91 gives workspaces a
 * real per-account owner -- removing a button with no real target beats
 * keeping one that either no-ops or deletes the wrong thing.
 *
 * Account deletion requires typing the username. A confirm button alone is a
 * reflex; typing the name is the smallest friction that forces someone to read
 * what they are about to do.
 */
export function DangerZone({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canConfirm = typed === username && !deleting;

  async function confirm() {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Could not delete your account.");
        setDeleting(false);
        return;
      }
      toast.success("Account deleted");
      // Full navigation, not router.push: every client-side store (session,
      // profile, workspace state) needs to reset, not just the route.
      window.location.href = "/";
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-s-4">
      <Row
        title="Delete your account"
        description="Removes your profile, published papers, comments, and follows. Cannot be undone."
        cta="Delete account"
        onClick={() => setOpen(true)}
      />

      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setTyped("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your profile, every published paper, comments, and follows. It cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-s-2">
            <Label htmlFor="confirmName">
              Type <span className="font-mono text-ink">{username}</span> to confirm
            </Label>
            <Input
              id="confirmName"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!canConfirm} onClick={confirm}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({
  title,
  description,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-s-3 rounded-md border border-border p-s-4">
      <div className="min-w-0">
        <p className="font-sans text-sm text-ink">{title}</p>
        <p className="mt-0.5 font-sans text-xs text-ink-faint">{description}</p>
      </div>
      <Button variant="destructive" size="sm" onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}
