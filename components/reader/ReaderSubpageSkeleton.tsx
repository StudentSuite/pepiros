import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Shared shape for the Learn/Outline/Audit route-level loading.tsx files
 * (issue #390): each page's own header is `h1` + subtitle + ReaderTabsNav
 * inside a `mx-auto max-w-6xl p-s-5` main, so one skeleton covers all
 * three rather than three near-identical copies.
 */
export function ReaderSubpageSkeleton() {
  return (
    <div className="min-h-dvh bg-surface" role="status" aria-label="Loading">
      <div className="mx-auto max-w-6xl p-s-5">
        <div className="mb-s-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="max-w-3xl">
          <SkeletonText lines={5} />
        </div>
      </div>
    </div>
  );
}
