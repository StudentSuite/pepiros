import type { ReactNode } from "react";

/**
 * Small hover-only label -- IconButton already sets a native `title` as a
 * baseline fallback, this replaces the ugly browser tooltip with one that
 * matches Editorial Paper's micro-type. CSS-only (group-hover), no JS
 * positioning: for anything richer than a one-line label, use Popover.
 */
export function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom";
  children: ReactNode;
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded border border-border-strong bg-surface-sunken px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted opacity-0 shadow-e-2 transition duration-fast ease-out group-hover/tooltip:opacity-100 ${
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
