"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
 *
 * Issue #200: this used to only handle Escape -- no ArrowUp/ArrowDown, no
 * focus moved to the first item on open, no focus returned to the trigger on
 * close, and the trigger itself was an unlabeled, unfocusable <span onClick>
 * rather than a real button. Fixed ahead of its first real consumer rather
 * than shipping the gap forward.
 */
export function Menu({
  trigger,
  items,
  align = "left",
}: {
  /** Presentational content only (e.g. an icon + label span) -- this component renders the actual
   *  `<button>`, so `trigger` must not itself contain an interactive element (nested buttons are invalid HTML). */
  trigger: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useClickOutside(ref, () => setOpen(false));

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const delta = e.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + items.length) % items.length;
    itemRefs.current[next]?.focus();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={clsx(
            "absolute top-full z-50 mt-1 min-w-40 rounded-md border border-border-strong bg-surface-raised py-1 shadow-e-2",
            "animate-[expand-in_var(--dur-fast)_var(--ease-out)]",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect();
                close();
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
