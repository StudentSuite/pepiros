"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";

/** Issue #85: revokes every session for this account, not just this device's. */
export function LogoutEverywhereButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/logout-everywhere", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not sign out other devices.");
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
    <Button variant="outline" className="gap-1.5" disabled={pending} onClick={run}>
      <ShieldOff className="size-4" />
      {pending ? "Signing out everywhere…" : "Sign out everywhere"}
    </Button>
  );
}
