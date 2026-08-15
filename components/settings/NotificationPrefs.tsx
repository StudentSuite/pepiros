"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/shadcn/switch";
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

export function NotificationPrefs() {
  const [on, setOn] = useState<Record<string, boolean>>({
    follow: true,
    comment: true,
    like: false,
    digest: true,
  });

  function toggle(key: string, value: boolean) {
    setOn((p) => ({ ...p, [key]: value }));
    toast.success(value ? "Notification on" : "Notification off");
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
              onCheckedChange={(v) => toggle(p.key, v)}
            />
          </div>
        </SettingsRow>
      ))}
    </div>
  );
}
