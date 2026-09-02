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

/**
 * Issue #349: the dashboard (StatCard, ReachCharts, AnalyticsClient) used
 * shadcn/card instead, every call site already overriding its
 * border-border bg-card back toward this app's own tokens -- these three
 * slots (the only ones any real consumer used; no CardDescription/CardFooter
 * call site existed) let them move onto the one Card without losing the
 * header/title structure they relied on.
 */
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("flex flex-col gap-s-1 p-s-4 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("font-sans font-semibold leading-none tracking-tight text-ink", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("p-s-4 pt-0", className)} {...props} />;
}
