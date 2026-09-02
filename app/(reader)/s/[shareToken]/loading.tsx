import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/** Issue #390: matches ShareClient's real shape (full-width, no sidebar -- a
 *  shared link is read-only) rather than the reader's own three-pane one. */
export default function Loading() {
  return (
    <div className="min-h-dvh" role="status" aria-label="Loading shared workspace">
      <div className="flex h-topbar items-center border-b border-border px-s-5">
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="mx-auto max-w-6xl p-s-5">
        <Skeleton className="h-6 w-80" />
        <div className="mt-s-5 grid gap-s-5 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-s-4">
            <Skeleton className="aspect-[612/792] w-full max-w-xl" />
            <SkeletonText lines={4} />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
