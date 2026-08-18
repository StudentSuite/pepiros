"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/shadcn/switch";
import type { NotificationPrefs as NotificationPrefsValue } from "@/lib/data/types";
import { SettingsRow } from "./SettingsRow";

const PREFS = [
  {
    key: "follow",
    label: "New follower",
    hint: "One notification per follower, not a digest.",
  },
  {
    key: "comment",
    label: "Comments on your papers",
    hint: "Includes comments anchored to a single claim.",
  },
  { key: "like", label: "Likes", hint: "Can get noisy on a popular paper." },
  {
    key: "digest",
    label: "Weekly digest",
    hint: "One email on Sunday, or nothing at all if the week was quiet.",
  },
] as const;

export function NotificationPrefs({ initial }: { initial: NotificationPrefsValue }) {
  const [on, setOn] = useState<NotificationPrefsValue>(initial);

  async function toggle(key: keyof NotificationPrefsValue, value: boolean) {
    const previous = on[key];
    setOn((p) => ({ ...p, [key]: value })); // Optimistic: the switch flips immediately, corrected below on failure.
    try {
      const res = await fetch("/api/settings/notification-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error();
      toast.success(value ? "Notification on" : "Notification off");
    } catch {
      setOn((p) => ({ ...p, [key]: previous }));
      toast.error("Could not save that -- try again.");
    }
  }

  return (
    <div>
      {PREFS.map((p) => (
        <SettingsRow
          key={p.key}
          label={p.label}
          description={p.hint}
          htmlFor={`pref-${p.key}`}
        >
          {/* The control sits right-aligned so all four switches share one
              vertical axis, which is what makes the column scannable. */}
          <div className="flex sm:justify-end">
            <Switch
              id={`pref-${p.key}`}
              checked={on[p.key] ?? false}
              onCheckedChange={(v) => void toggle(p.key, v)}
            />
          </div>
        </SettingsRow>
      ))}
    </div>
  );
}
