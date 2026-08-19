import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Issue #134: same gap as discover/loading.tsx, this route's own shape --
 * a centered profile header (avatar, name, bio, stats) then a stack of
 * that person's papers, matching u/[username]/page.tsx.
 */
export default function ProfileLoading() {
  return (
    <div className="pb-s-5" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-3xl border-b border-border py-s-7 text-center">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-s-4 h-7 w-48" />
        <Skeleton className="mx-auto mt-1 h-3 w-24" />
        <Skeleton className="mx-auto mt-s-4 h-4 w-64" />
        <Skeleton className="mx-auto mt-s-5 h-8 w-24 rounded-full" />
      </div>

      <div className="mx-auto max-w-3xl flex flex-col gap-s-6 pt-s-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
