"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/shadcn/switch";
import { Label } from "@/components/shadcn/label";

const PREFS = [
  { key: "follow", label: "Someone follows you", hint: "A single notification, not a digest." },
  { key: "comment", label: "New comment on your paper", hint: "Includes comments anchored to one claim." },
  { key: "like", label: "Someone likes your paper" },
  { key: "digest", label: "Weekly activity digest", hint: "One email on Sunday, or nothing if the week was quiet." },
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
    toast.success("Preference updated", {
      description: "On the demo account this is not persisted.",
    });
  }

  return (
    <div className="flex flex-col gap-s-4">
      {PREFS.map((p) => (
        <div key={p.key} className="flex items-start justify-between gap-s-4">
          <div className="min-w-0">
            <Label htmlFor={`pref-${p.key}`} className="font-sans text-sm text-ink">
              {p.label}
            </Label>
            {"hint" in p && p.hint && (
              <p className="mt-0.5 font-sans text-xs text-ink-faint">{p.hint}</p>
            )}
          </div>
          <Switch
            id={`pref-${p.key}`}
            checked={on[p.key] ?? false}
            onCheckedChange={(v) => toggle(p.key, v)}
          />
        </div>
      ))}
    </div>
  );
}
