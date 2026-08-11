"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { usePanelBehavior } from "./Dialog";
import { IconButton } from "./IconButton";
import { X } from "lucide-react";

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
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  usePanelBehavior(open, onClose, panelRef);

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
        aria-labelledby={title ? "drawer-title" : undefined}
        className={clsx(
          "absolute right-0 top-0 flex h-full w-inspector flex-col gap-4 border-l border-border-strong bg-surface-raised p-5 shadow-e-3",
          "animate-[expand-in_var(--dur-canvas)_var(--ease-out)]",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          {title && (
            <h2 id="drawer-title" className="font-serif text-lg text-ink">
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
