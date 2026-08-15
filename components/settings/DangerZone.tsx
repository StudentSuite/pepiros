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

type Action = "workspace" | "account" | null;

/**
 * Destructive actions.
 *
 * Account deletion requires typing the username. A confirm button alone is a
 * reflex; typing the name is the smallest friction that forces someone to read
 * what they are about to do.
 */
export function DangerZone({ username }: { username: string }) {
  const [pending, setPending] = useState<Action>(null);
  const [typed, setTyped] = useState("");

  const needsTyping = pending === "account";
  const canConfirm = !needsTyping || typed === username;

  function confirm() {
    toast.success(
      pending === "account" ? "Account deleted" : "Workspace deleted",
      { description: "Demo account: nothing was actually deleted." },
    );
    setPending(null);
    setTyped("");
  }

  return (
    <div className="flex flex-col gap-s-4">
      <Row
        title="Delete this workspace"
        description="Removes the workspace and its reading graph. Published papers are not affected."
        cta="Delete workspace"
        onClick={() => setPending("workspace")}
      />
      <Row
        title="Delete your account"
        description="Removes your profile, workspaces, published papers, and reach history."
        cta="Delete account"
        onClick={() => setPending("account")}
      />

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null);
            setTyped("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === "account" ? "Delete your account?" : "Delete this workspace?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "account"
                ? "This removes your profile, every workspace, every published paper, and all reach history. It cannot be undone."
                : "This removes the workspace and its reading graph. It cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {needsTyping && (
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
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!canConfirm} onClick={confirm}>
              Delete
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
