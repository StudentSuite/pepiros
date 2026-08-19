import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Issue #136: app/(app) had no loading.tsx of its own, so any suspense here
 * fell through to the root app/loading.tsx -- rendered above
 * app/(app)/layout.tsx, so it unmounted the whole AppSidebar rather than
 * only swapping the content next to it. Placed here instead, Next renders
 * this only in the layout's {children} slot, so the sidebar stays put.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl p-s-5" aria-busy="true" aria-label="Loading">
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
