import { Skeleton } from "@/components/ui/Skeleton";
import { ReadingColumn } from "@/components/reading/Article";

/**
 * Loading fallback for /upload -- mirrors UploadForm.tsx's real shape
 * (header, the "what happens to your file" note, mode tabs, dropzone)
 * instead of falling through to the root loading.tsx's prose skeleton,
 * which has the wrong silhouette for a form with a dropzone. `wide`, to
 * match issue #302's wide-column pass (was the default ~42rem measure).
 */
export function UploadFormSkeleton() {
  return (
    <main className="pb-s-5" aria-busy="true" aria-label="Loading">
      <ReadingColumn wide>
        <div className="py-s-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-s-3 h-8 w-2/3" />
          <Skeleton className="mt-s-3 h-4 w-4/5" />
        </div>

        <Skeleton className="h-20 w-full rounded-md" />

        <div className="mt-s-6 flex flex-col gap-s-5">
          <div className="flex gap-s-4 border-b border-border pb-s-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      </ReadingColumn>
    </main>
  );
}
