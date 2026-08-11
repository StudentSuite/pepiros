import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

/**
 * Shared chrome behind PillarChip, EvidenceBadge, and RefChip -- they kept
 * their own exported components (call sites are unchanged) but no longer
 * duplicate the pill/tag markup three times. `pill` is the rounded-full +
 * optional dot shape (PillarChip, EvidenceBadge); `tag` is RefChip's small
 * mono rectangle.
 */
export function Badge({
  variant = "pill",
  dotClassName,
  dotStyle,
  className,
  style,
  children,
}: {
  variant?: "pill" | "tag";
  dotClassName?: string;
  dotStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span
      style={style}
      className={clsx(
        "inline-flex items-center font-sans text-xs",
        variant === "pill"
          ? "gap-1.5 rounded-full border border-border px-2 py-0.5"
          : "rounded border border-border-strong bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted",
        className,
      )}
    >
      {(dotClassName || dotStyle) && (
        <span className={clsx("h-1.5 w-1.5 rounded-full", dotClassName)} style={dotStyle} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
