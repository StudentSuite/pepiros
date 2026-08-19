import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Issue #134: no interim state between blank and fully populated for the
 * initial server-rendered fetch. Shaped like the real page (centered
 * kicker header, then a filter bar, then a stack of paper rows) rather
 * than a generic block, matching discover/page.tsx + FeedClient.tsx.
 */
export default function DiscoverLoading() {
  return (
    <div className="pb-s-5" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-3xl border-b border-border py-s-7 text-center">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="mx-auto mt-s-3 h-4 w-72" />
      </div>

      <div className="mx-auto max-w-3xl pt-s-5">
        <div className="flex items-center gap-s-4 border-b border-border pb-s-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-9 w-40" />
        </div>

        <div className="flex flex-col gap-s-6 border-t border-border pt-s-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
