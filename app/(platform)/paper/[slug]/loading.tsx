import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Issue #134: same gap as discover/loading.tsx, this route's own shape --
 * a wide reading-column article (kicker, title, byline, prose), matching
 * paper/[slug]/page.tsx's ArticleHeader/ArticleBody.
 */
export default function PaperLoading() {
  return (
    <div className="mx-auto max-w-2xl p-s-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-s-4 h-9 w-full" />
      <Skeleton className="mt-s-2 h-9 w-2/3" />
      <div className="mt-s-4 flex items-center gap-s-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="mt-s-7 flex flex-col gap-s-5">
        <SkeletonText lines={4} />
        <SkeletonText lines={3} />
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
