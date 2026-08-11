"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";

/**
 * Richer floating content than Tooltip -- click-triggered, closes on
 * outside click or Escape. The consumer wraps trigger + Popover in a
 * `relative` container (no floating-ui/portal here; every current use case
 * is inline content, not something that needs viewport-edge flipping).
 */
export function Popover({
  open,
  onClose,
  align = "left",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
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
