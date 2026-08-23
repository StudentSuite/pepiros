import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Mirrors paper/[slug]/page.tsx: a max-w-[58rem] grid, lg:grid-cols-[1fr_15rem],
 * main column pinned to max-w-[42rem] wrapping ArticleHeader/source-row/the
 * grounded write-up, and a byline+engagement rail that's sticky at lg (issue
 * #300) but renders inline atop the main column below lg instead.
 *
 * A claim is a title, a tier chip and its located quote, so that is what the
 * stand-in draws for the write-up -- the majority of the page and the reason
 * anyone opened it.
 *
 * Header metrics are ArticleHeader's own: `pt-s-7 pb-s-6`, an 11px mono kicker
 * at `mb-s-3`, an h1 at text-[2rem]/sm:text-[2.6rem], and a dek at text-lg.
 */
export default function PaperLoading() {
  const byline = (
    <div className="flex items-center gap-s-3 border-y border-border py-s-4">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-1 h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-full" />
    </div>
  );

  return (
    <div
      className="mx-auto w-full max-w-[58rem] px-s-5 lg:grid lg:grid-cols-[1fr_15rem] lg:items-start lg:gap-s-7"
      aria-busy="true"
      aria-label="Loading paper"
    >
      <div className="min-w-0 max-w-[42rem]">
        <header className="pb-s-6 pt-s-7">
          {/* kicker: the paper's field */}
          <Skeleton className="mb-s-3 h-3 w-24" />
          {/* title, two lines at display size */}
          <Skeleton className="h-10 w-full sm:h-12" />
          <Skeleton className="mt-s-2 h-10 w-4/5 sm:h-12" />
          {/* the dek */}
          <Skeleton className="mt-s-4 h-6 w-full" />
          <Skeleton className="mt-s-2 h-6 w-2/3" />
        </header>

        {/* byline: inline here below lg, in the sticky rail instead at lg */}
        <div className="lg:hidden">{byline}</div>

        {/* source row: authors, year, venue, "read the original" */}
        <div className="mt-s-1 flex flex-wrap items-center gap-s-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-28" />
        </div>

        {/* "Open in reader" pill */}
        <Skeleton className="mt-s-4 h-10 w-40 rounded-full" />

        {/* The grounded write-up: a run of claims, each with its located
            quote sitting subordinate underneath. */}
        <div className="mt-s-6 flex flex-col gap-s-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <section key={i}>
              {/* claim heading */}
              <Skeleton className="h-6 w-3/5" />
              <div className="mt-s-3">
                <SkeletonText lines={3} />
              </div>
              {/* the evidence chip + the quote it points at, indented behind a
                  rule exactly as the real quote block is */}
              <div className="mt-s-3 border-l-2 border-border pl-s-4">
                <Skeleton className="h-5 w-32 rounded-full" />
                <div className="mt-s-2">
                  <SkeletonText lines={2} />
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* the denominators line under the write-up */}
        <Skeleton className="mt-s-6 h-12 w-full rounded-md" />

        {/* comments, below a full-width rule */}
        <div className="mt-s-7 border-t border-border pt-s-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-s-4 flex flex-col gap-s-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-s-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <div className="mt-s-2">
                    <SkeletonText lines={2} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden lg:sticky lg:top-[calc(var(--topbar)+1.5rem)] lg:block">
        {byline}
      </div>
    </div>
  );
}
