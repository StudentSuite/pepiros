"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { usePanelBehavior } from "./Dialog";
import { IconButton } from "./IconButton";
import { X } from "lucide-react";

/**
 * Issue #384: the five things a modal must do -- focus trap, role="dialog"
 * aria-modal, Escape closes, focus restores to the trigger, and body scroll
 * locks -- usePanelBehavior already covered the first four; this was the
 * one gap, verified against the checklist. Not folded into usePanelBehavior
 * itself: Popover (the hook's other consumer) is deliberately not a true
 * modal -- it's dismissible while the page behind it stays interactive --
 * so locking body scroll there would be wrong.
 */
function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/**
 * Right-anchored slide-in panel -- same portal/backdrop/focus-trap/Escape
 * behavior as Dialog, different geometry. Sized off the --inspector token
 * (design/DIRECTIONS.md, docs/PLAN-V1.md §14.2) so it matches the
 * inspector's spec'd width everywhere it's used.
 */
export function Drawer({
  open,
  onClose,
  title,
  labelledBy,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Issue #197: id of a heading already rendered inside `children`, for a
   * caller (e.g. GraphCanvas wrapping NodeInspector) whose title text is only
   * known to the child, not the caller -- an alternative to `title` rather
   * than requiring content be duplicated up into this component just to name
   * the dialog. Without either, the drawer opens with no accessible name at
   * all: a screen reader announces only "dialog".
   */
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  usePanelBehavior(open, onClose, panelRef);
  useBodyScrollLock(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-surface-sunken/60 transition duration-base ease-out"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : labelledBy}
        className={clsx(
          "absolute right-0 top-0 flex h-full w-inspector flex-col gap-4 border-l border-border-strong bg-surface-raised p-5 shadow-e-3",
          "animate-[expand-in_var(--dur-canvas)_var(--ease-out)]",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          {title && (
            <h2 id="drawer-title" className="font-sans font-semibold text-lg text-ink">
              {title}
            </h2>
          )}
          <IconButton icon={X} label="Close" onClick={onClose} className="ml-auto" />
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
