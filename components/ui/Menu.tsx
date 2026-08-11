"use client";

import { useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * Trigger + dropdown list, click-outside/Escape to close, arrow-key
 * navigation between items. No current consumer in the app yet -- built
 * alongside Tabs since both are "pick one of several" UI, first candidate
 * use is a canvas node's overflow menu (delete, re-verify, ...).
 */
export function Menu({
  trigger,
  items,
  align = "left",
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative inline-block">
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className={clsx(
            "absolute top-full z-50 mt-1 min-w-40 rounded-md border border-border-strong bg-surface-raised py-1 shadow-e-2",
            "animate-[expand-in_var(--dur-fast)_var(--ease-out)]",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={clsx(
                "block w-full px-3 py-1.5 text-left font-sans text-xs transition duration-fast ease-out",
                item.danger ? "text-unsupported hover:bg-unsupported/10" : "text-ink hover:bg-surface-sunken",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
