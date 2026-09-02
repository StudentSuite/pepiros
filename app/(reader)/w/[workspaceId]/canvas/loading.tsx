import { Skeleton } from "@/components/ui/Skeleton";

/** Issue #390: matches CanvasHeader's bar plus the full-bleed canvas body below it. */
export default function Loading() {
  return (
    <div className="flex h-dvh w-full flex-col bg-surface" role="status" aria-label="Loading graph">
      <div className="flex h-topbar shrink-0 items-center gap-s-3 border-b border-border px-s-5">
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="min-h-0 flex-1" />
    </div>
  );
}
