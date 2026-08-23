import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading state for the signed-in shell's content slot.
 *
 * SCOPE NOTE. This deliberately does NOT draw a sidebar or a topbar. Next
 * renders this file into app/(app)/layout.tsx's {children}, so AppSidebar and
 * the sticky header are already on screen and stay mounted throughout; adding
 * skeleton copies of them here would paint a second, narrower sidebar next to
 * the real one. (That is the same reasoning that put this file here rather
 * than letting the root app/loading.tsx serve these routes, which unmounted
 * the whole shell.)
 *
 * What it does mirror is what actually swaps: the PageHeader row (title +
 * description on the left, actions on the right) and the card grid beneath it.
 * Container metrics are the dashboard pages' own, `max-w-6xl p-s-5`, and the
 * grid steps 1 -> 2 -> 3 columns at the same breakpoints
 * (app/(app)/workspaces/page.tsx).
 */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-s-5" aria-busy="true" aria-label="Loading">
      {/* PageHeader */}
      <div className="flex flex-wrap items-start justify-between gap-s-4">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-s-2 h-4 w-72" />
        </div>
        <div className="flex items-center gap-s-2">
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>

      {/* Card grid */}
      <div className="mt-s-6 grid grid-cols-1 gap-s-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface-raised p-s-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-s-3 h-3.5 w-full" />
            <Skeleton className="mt-s-2 h-3.5 w-5/6" />
            <div className="mt-s-4 flex items-center gap-s-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
