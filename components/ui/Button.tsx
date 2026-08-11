import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

const VARIANT_CLASS = {
  primary: "bg-accent text-paper hover:bg-accent-hover active:bg-accent-sunk",
  secondary:
    "border border-border-strong bg-surface-raised text-ink hover:border-accent",
  ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
  danger: "border border-unsupported/40 text-unsupported hover:bg-unsupported/10",
} as const;

const SIZE_CLASS = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASS;
export type ButtonSize = keyof typeof SIZE_CLASS;

/**
 * No SaaS gradient, no heavy drop shadow -- Editorial Paper's restrained
 * button (design/DIRECTIONS.md). `primary` is the one solid-fill variant,
 * reserve it for the single most important action on a surface.
 */
export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md font-sans font-medium transition duration-fast ease-out",
        "focus-visible:outline-none focus-visible:shadow-glow-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  );
}
