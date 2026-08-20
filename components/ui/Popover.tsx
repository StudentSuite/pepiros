"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";
import { usePanelBehavior } from "./Dialog";

/**
 * Richer floating content than Tooltip -- click-triggered, closes on
 * outside click or Escape. The consumer wraps trigger + Popover in a
 * `relative` container (no floating-ui/portal here; every current use case
 * is inline content, not something that needs viewport-edge flipping).
 *
 * Issue #198: this used to bind Escape only on its own div and never moved
 * focus into itself on open, unlike Dialog/Drawer's usePanelBehavior. A
 * keyboard user who opened this via Enter/Space on a trigger (e.g.
 * CitationChip's RefChip button) had focus stay on the trigger -- Escape did
 * nothing since focus was never inside this subtree to catch the keydown --
 * so the only way to dismiss it was a mouse click elsewhere. Now reuses the
 * same panel behavior (focus the first focusable child on open, trap Tab,
 * Escape closes, restore focus to the trigger on close) as every other
 * floating panel in the app, plus an aria-label so it doesn't announce as an
 * unnamed dialog.
 */
export function Popover({
  open,
  onClose,
  align = "left",
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  /** Accessible name for the dialog -- required since there's no visible title bar here. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);
  usePanelBehavior(open, onClose, ref);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={clsx(
        "absolute top-full z-50 mt-1 w-72 rounded border border-border bg-surface-raised p-3 shadow-e-2",
        "animate-[expand-in_var(--dur-fast)_var(--ease-out)]",
        align === "left" ? "left-0" : "right-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
