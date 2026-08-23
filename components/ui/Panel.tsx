import clsx from "clsx";
import type { HTMLAttributes } from "react";

/**
 * Shared raised-surface container -- app chrome, not the reading surface.
 * `padded` adds the p-s-4 every hand-rolled `border-border bg-surface-raised`
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
        // rounded-lg (--r-lg, 14px), not the plain rounded (--r-md, 10px)
        // default -- issue #304's "soft-rounded raised panels" spec, same
        // radius bump the upload dropzone got in #302.
        "rounded-lg border border-border bg-surface-raised shadow-e-1 transition-shadow duration-base ease-out hover:shadow-e-2",
        padded && "p-s-4",
        className,
      )}
      {...props}
    />
  );
}

/** Semantic alias -- same primitive, use whichever name reads better at the
 * call site (a "panel" of app chrome vs. a "card" in a list/grid). */
export { Panel as Card };
