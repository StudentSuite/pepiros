import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Shared between app/(reader)/w/[workspaceId]/loading.tsx (the route-level
 * Suspense fallback, shown before the client bundle has even hydrated --
 * issue #390) and ReaderClient.tsx's own `!workspace` branch (shown after
 * hydration, while the real workspace fetch is in flight). One component so
 * the two can never drift back apart the way the hand-rolled `h-screen
 * w-60` one used to (issue #360): the rail matches the real sidebar's own
 * box (h-svh w-64, per components/shadcn/sidebar.tsx's SIDEBAR_WIDTH).
 */
export function ReaderSkeleton() {
  return (
    <div className="flex min-h-dvh" role="status" aria-label="Loading workspace">
      <Skeleton className="h-svh w-64 shrink-0" />
      <div className="flex-1 p-s-5">
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
