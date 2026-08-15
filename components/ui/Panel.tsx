import clsx from "clsx";
import type { HTMLAttributes } from "react";

/**
 * Shared raised-surface container -- app chrome, not the reading surface.
 * `padded` adds the p-4 every hand-rolled `border-border bg-surface-raised`
 * div in the app (ReaderClient's inspector wrapper, etc.) was repeating
 * instead of reaching for this.
 */
export function Panel({
  padded,
  className,
  ...props
}: { padded?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded border border-border bg-surface-raised shadow-e-1 transition-shadow duration-base ease-out hover:shadow-e-2",
        padded && "p-4",
        className,
      )}
      {...props}
    />
  );
}

/** Semantic alias -- same primitive, use whichever name reads better at the
 * call site (a "panel" of app chrome vs. a "card" in a list/grid). */
export { Panel as Card };
