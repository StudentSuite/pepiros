import clsx from "clsx";

/** Base shimmer block, per docs/PLAN-V1.md §14.5: never a bare spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("motion-shimmer rounded bg-surface-sunken", className)} aria-hidden="true" />;
}

/** N shimmer lines at prose width -- Stage C6's node-body loading state. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
