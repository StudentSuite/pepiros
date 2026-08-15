import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Root loading fallback. None existed before, so any server-rendered route
 * that suspended showed a blank document until it resolved.
 *
 * Shaped like a page rather than a spinner: matching the eventual layout keeps
 * the transition from feeling like a jump.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-s-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-s-4 h-8 w-2/3" />
      <div className="mt-s-5 max-w-xl">
        <SkeletonText lines={3} />
      </div>
      <div className="mt-s-7 flex flex-col gap-s-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
