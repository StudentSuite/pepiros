import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/card";
import { cn } from "@/lib/utils";

/**
 * A single headline number.
 *
 * Card theming follows the brief: solid fill in light mode, a border-led
 * treatment in dark. That is handled by the --card token flipping, plus the
 * explicit border, rather than by two separate components.
 *
 * The delta is never colour-only. An arrow carries the same information, so it
 * survives both colour blindness and a greyscale print.
 */
export function StatCard({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  className?: string;
}) {
  const dir = delta === undefined ? null : delta > 0.001 ? "up" : delta < -0.001 ? "down" : "flat";
  const DeltaIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <Card className={cn("border-border bg-card", className)}>
      <CardContent className="p-s-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
          {label}
        </p>
        <div className="mt-s-2 flex items-baseline gap-s-2">
          <span className="font-serif text-2xl leading-none text-ink">{value}</span>
          {dir && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-mono text-[11px]",
                dir === "up" && "text-pillar-text-7",
                dir === "down" && "text-pillar-text-5",
                dir === "flat" && "text-ink-faint",
              )}
            >
              <DeltaIcon className="size-3" strokeWidth={1.5} />
              {delta !== undefined && `${Math.abs(delta * 100).toFixed(1)}%`}
            </span>
          )}
        </div>
        {hint && <p className="mt-s-1 font-sans text-xs text-ink-faint">{hint}</p>}
      </CardContent>
    </Card>
  );
}
