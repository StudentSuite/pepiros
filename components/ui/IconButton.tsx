import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "./Icon";

const VARIANT_CLASS = {
  ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
  secondary: "border border-border-strong bg-surface-raised text-ink hover:border-accent",
} as const;

/** Icon-only button. `label` is required -- it becomes the aria-label, an
 * icon alone is never an accessible name (design/DIRECTIONS.md § Icons). */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  className,
  ...props
}: {
  icon: LucideIcon;
  label: string;
  variant?: keyof typeof VARIANT_CLASS;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition duration-fast ease-out",
        "focus-visible:outline-none focus-visible:shadow-glow-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    >
      <Icon icon={icon} size="sm" />
    </button>
  );
}
