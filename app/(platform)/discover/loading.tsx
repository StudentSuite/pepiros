import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Mirrors discover/page.tsx + components/discover/FeedClient.tsx.
 *
 * Three bands, in the order they actually render: the centred header inside
 * ReadingColumn, then the sticky filter bar (sort links left, search field
 * right, field chips underneath), then hairline-separated feed rows with the
 * claim-count/grounding-tier column in a fixed 28-unit column on the right
 * (issue #299: this replaced a fabricated "readers" score with real claim
 * counts and a per-paper evidence-tier badge).
 *
 * Dimensions below are FeedClient's own: `pt-s-4 pb-s-4` on the (now sticky)
 * filter bar, `py-s-4` on the chip row, `border-t pt-s-6` before the first
 * row, `w-28 text-right` on the aside (three lines tall now: claim count,
 * "claims" label, tier badge -- taller than the old single-number readers
 * counter, so the row height below grew to match).
 */
export default function DiscoverLoading() {
  return (
    <div className="pb-s-5" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-3xl border-b border-border py-s-7 text-center">
        {/* h1 at text-[2rem]/sm:text-[2.4rem], then the two-line dek */}
        <Skeleton className="mx-auto h-9 w-44" />
        <Skeleton className="mx-auto mt-s-3 h-4 w-80" />
        <Skeleton className="mx-auto mt-s-2 h-4 w-64" />
      </div>

      <div className="mx-auto max-w-3xl pt-s-5">
        {/* sort links left, search input right (h-9, basis-[220px]) */}
        <div className="flex flex-wrap items-center gap-s-4 border-b border-border pb-s-4 pt-s-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <div className="ml-auto min-w-0 flex-1 basis-[220px]">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>

        {/* field filter chips */}
        <div className="flex flex-wrap items-center gap-s-2 py-s-4">
          {[72, 96, 64, 88, 80].map((w, i) => (
            <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
          ))}
        </div>

        <div className="border-t border-border pt-s-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-s-4 py-s-4">
              <div className="min-w-0 flex-1">
                {/* discipline chip (pill, not plain text now) */}
                <Skeleton className="h-5 w-20 rounded-full" />
                {/* title, then dek */}
                <Skeleton className="mt-s-2 h-5 w-11/12" />
                <Skeleton className="mt-s-2 h-4 w-3/4" />
                {/* author line */}
                <Skeleton className="mt-s-2 h-3 w-40" />
              </div>
              {/* claim count + "claims" label + tier badge, w-28 column */}
              <div className="w-28 shrink-0">
                <Skeleton className="ml-auto h-6 w-10" />
                <Skeleton className="ml-auto mt-s-1 h-3 w-12" />
                <Skeleton className="ml-auto mt-1 h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
