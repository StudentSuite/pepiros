import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

/**
 * Thin wrapper enforcing the icon convention across the app: 1.5px stroke,
 * no fill, sized off the type scale so an icon never looks heavier than the
 * text label sitting next to it. See design/DIRECTIONS.md.
 */
export function Icon({
  icon: LucideIconComponent,
  size = "sm",
  className,
}: {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const px = { xs: 14, sm: 16, md: 20 }[size];
  return (
    <LucideIconComponent
      size={px}
      strokeWidth={1.5}
      className={clsx("shrink-0", className)}
    />
  );
}
