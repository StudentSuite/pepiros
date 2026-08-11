import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { Icon } from "./Icon";
import { Button } from "./Button";

/**
 * Inline error/rate-limit banner with an optional retry action. Per
 * docs/PLAN-V1.md §14.5: name what happened, then what to do, no apologies.
 */
export function ErrorBanner({
  message,
  variant = "error",
  onRetry,
  className,
}: {
  message: string;
  variant?: "error" | "warn";
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={clsx(
        "flex items-center gap-2 rounded-md border px-3 py-2 font-sans text-xs",
        variant === "error" ? "border-unsupported/40 text-unsupported" : "border-ungrounded/40 text-ungrounded",
        className,
      )}
    >
      <Icon icon={AlertTriangle} size="xs" className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
          Retry
        </Button>
      )}
    </div>
  );
}
