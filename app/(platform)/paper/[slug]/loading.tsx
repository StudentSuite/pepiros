import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Mirrors paper/[slug]/page.tsx: ReadingColumn (max-w-[42rem], px-s-5) wrapping
 * an ArticleHeader, the byline/source row, and then the grounded write-up.
 *
 * The previous version was `max-w-2xl p-s-5` with three prose blocks. Two
 * things were wrong with that. The width was 32rem against the real 42rem, so
 * every line reflowed on arrival, and it showed nothing where the claim rows
 * go -- which on this route is the majority of the page and the reason anyone
 * opened it. A claim is a title, a tier chip and its located quote, so that is
 * what the stand-in draws.
 *
 * Header metrics are ArticleHeader's own: `pt-s-7 pb-s-6`, an 11px mono kicker
 * at `mb-s-3`, an h1 at text-[2rem]/sm:text-[2.6rem], and a dek at text-lg.
 */
export default function PaperLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[42rem] px-s-5"
      aria-busy="true"
      aria-label="Loading paper"
    >
      <header className="pb-s-6 pt-s-7">
        {/* kicker: the paper's field */}
        <Skeleton className="mb-s-3 h-3 w-24" />
        {/* title, two lines at display size */}
        <Skeleton className="h-10 w-full sm:h-12" />
        <Skeleton className="mt-s-2 h-10 w-4/5 sm:h-12" />
        {/* the dek */}
        <Skeleton className="mt-s-4 h-6 w-full" />
        <Skeleton className="mt-s-2 h-6 w-2/3" />

        {/* byline row: authors, year, venue, licence */}
        <div className="mt-s-5 flex flex-wrap items-center gap-s-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* "Open in reader" pill */}
        <Skeleton className="mt-s-4 h-10 w-40 rounded-full" />
      </header>

      {/* The grounded write-up: a run of claims, each with its located quote
          sitting subordinate underneath. */}
      <div className="flex flex-col gap-s-6">
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
  );
}
