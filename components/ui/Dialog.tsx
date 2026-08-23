"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { IconButton } from "./IconButton";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Shared focus-trap + Escape-to-close behaviour for Dialog and Drawer. */
function usePanelBehavior(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose, panelRef]);
}

/**
 * Centered modal dialog: portal, backdrop click + Escape + focus-trap close.
 * For a side-anchored panel (e.g. the canvas node inspector) use Drawer
 * instead -- same behavior, different geometry.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  usePanelBehavior(open, onClose, panelRef);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-surface-sunken/80 animate-[expand-in_var(--dur-fast)_var(--ease-out)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={clsx(
          "relative flex max-h-[80vh] w-full max-w-md flex-col gap-4 rounded-lg border border-border-strong bg-surface-raised p-5 shadow-e-3",
          "animate-[expand-in_var(--dur-base)_var(--ease-out)]",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <h2 id="dialog-title" className="font-sans font-semibold text-lg text-ink">
            {title}
          </h2>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export { usePanelBehavior };
