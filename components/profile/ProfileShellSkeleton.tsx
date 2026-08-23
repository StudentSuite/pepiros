import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading shape for anything rendered through <ProfileShell>.
 *
 * Shared by /u/[username] and /open because they share the shell itself: two
 * hand-written skeletons would drift apart the moment the shell changed, and
 * the whole value of a skeleton is that it is the same shape as the thing it
 * stands in for.
 *
 * EVERY DIMENSION HERE IS COPIED FROM ProfileShell, not approximated. Same
 * `max-w-6xl` and horizontal padding, same `lg:w-64` rail, same avatar going
 * 16 -> 40 at `lg`, same `py-s-6` column gap, same tab-bar height built from
 * `py-s-3` on a `text-sm` row. That is what stops the page shifting when the
 * real content lands: a skeleton that is merely "about right" moves everything
 * down a few pixels on arrival, which reads as jank even though the load was
 * fast.
 *
 * If ProfileShell's measurements change, this file changes with it.
 */

/** One hairline-separated row, matching components/profile/PaperRow.tsx. */
function RowSkeleton() {
  return (
    <li className="border-b border-border py-s-4 last:border-b-0">
      <div className="flex flex-col gap-s-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* title, at PaperRow's text-base */}
          <Skeleton className="h-4 w-3/4" />
          {/* authors line, mt-s-1 text-sm */}
          <Skeleton className="mt-s-1 h-3.5 w-1/2" />
          {/* the mono meta row, mt-s-2 text-xs */}
          <Skeleton className="mt-s-2 h-3 w-40" />
        </div>
        {/* the pill on the right, px-s-4 py-s-2 text-sm */}
        <div className="shrink-0 sm:pl-s-4">
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
    </li>
  );
}

export function ProfileShellSkeleton({
  /** How many tab stubs to draw. Both current callers ship three. */
  tabs = 3,
  /**
   * The Overview tab leads with the contribution calendar; Papers and Activity
   * lead straight into rows. Defaults to the calendar because Overview is the
   * tab a cold URL lands on.
   */
  calendar = true,
  rows = 4,
}: {
  tabs?: number;
  calendar?: boolean;
  rows?: number;
} = {}) {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-s-4 sm:px-s-5"
      aria-busy="true"
      aria-label="Loading profile"
    >
      {/* Tab bar. border-b and the px-s-3/py-s-3 rhythm are the shell's own, so
          the real tabs drop into exactly this line. */}
      <div className="-mx-s-4 overflow-x-auto border-b border-border px-s-4 sm:-mx-s-5 sm:px-s-5">
        <div className="flex min-w-max gap-s-1">
          {Array.from({ length: tabs }).map((_, i) => (
            <div key={i} className="px-s-3 py-s-3">
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-s-6 py-s-6 lg:flex-row lg:gap-s-7">
        {/* Identity rail. Stacks beside the avatar below lg, under it above. */}
        <aside className="shrink-0 lg:w-64">
          <div className="flex items-center gap-s-4 lg:block">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full lg:h-40 lg:w-40" />
            <div className="min-w-0 flex-1 lg:mt-s-4">
              {/* name at text-xl / lg:text-2xl, then the mono handle */}
              <Skeleton className="h-6 w-40 lg:h-7" />
              <Skeleton className="mt-s-2 h-4 w-24" />
            </div>
          </div>

          {/* bio, mt-s-4, two lines at text-sm leading-relaxed */}
          <div className="mt-s-4 flex flex-col gap-s-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* the action slot: Follow is a pill */}
          <Skeleton className="mt-s-4 h-9 w-full rounded-full" />

          {/* meta list, mt-s-4 space-y-s-2, icon + label per row */}
          <div className="mt-s-4 space-y-s-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-s-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {calendar && (
            <section className="mb-s-6">
              {/* heading, then the grid at the calendar's real cell metrics:
                  11px cells on a 3px gutter, 7 rows, 53 columns. Drawn as one
                  block rather than 371 shimmering squares, which would cost
                  more to render than the content it is standing in for. */}
              <Skeleton className="h-5 w-56" />
              <div className="mt-s-4 overflow-hidden">
                <Skeleton className="h-[116px] w-full" />
              </div>
              <div className="mt-s-2 flex justify-end">
                <Skeleton className="h-3 w-32" />
              </div>
            </section>
          )}

          <ul className="flex flex-col">
            {Array.from({ length: rows }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
