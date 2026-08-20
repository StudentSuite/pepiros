"use client";

import clsx from "clsx";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/store/toast";
import { IconButton } from "./IconButton";
import { Icon } from "./Icon";

const VARIANT_CLASS = {
  info: "border-border-strong",
  success: "border-located/60",
  error: "border-unsupported/60",
} as const;

// Issue #199: severity used to be border-color alone. Each variant now also
// carries its own icon, same non-color-signal pattern as ErrorBanner/
// EvidenceBadge elsewhere in this app.
const VARIANT_ICON = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

const VARIANT_ICON_CLASS = {
  info: "text-ink-muted",
  success: "text-located",
  error: "text-unsupported",
} as const;

/** Mounted once in app/layout.tsx. Push a toast from anywhere with
 * `useToastStore.getState().push("message", "success")`. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            "flex items-center gap-3 rounded-md border bg-surface-raised px-3 py-2 shadow-e-2",
            "animate-[expand-in_var(--dur-base)_var(--ease-out)]",
            VARIANT_CLASS[t.variant],
          )}
        >
          <Icon icon={VARIANT_ICON[t.variant]} size="sm" className={clsx("shrink-0", VARIANT_ICON_CLASS[t.variant])} />
          <span className="font-sans text-sm text-ink">{t.message}</span>
          <IconButton icon={X} label="Dismiss" onClick={() => dismiss(t.id)} className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
}
