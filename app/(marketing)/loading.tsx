import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Issue #390: covers all 15 (marketing) pages at once -- loading.tsx wraps
 * this segment's own layout.tsx (which awaits getSession()) as well as
 * whichever page is inside, so one file here is the route-level fallback
 * for the whole group rather than 15 near-identical copies. Shaped like the
 * shared chrome (a slim top bar, then a wide hero-ish block) rather than
 * the root loading.tsx's narrower prose shape, which reads as the wrong
 * page shape here.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex h-topbar items-center border-b border-border px-s-5">
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="mx-auto w-full max-w-4xl p-s-5">
        <Skeleton className="mt-s-5 h-3 w-24" />
        <Skeleton className="mt-s-4 h-10 w-2/3" />
        <div className="mt-s-5 max-w-xl">
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  );
}
