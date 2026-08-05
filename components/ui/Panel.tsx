import clsx from "clsx";
import type { HTMLAttributes } from "react";

/** Shared raised-surface container -- app chrome, not the reading surface. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded border border-border bg-surface-raised", className)}
      {...props}
    />
  );
}
