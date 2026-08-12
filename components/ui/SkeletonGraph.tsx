import { Skeleton } from "@/components/ui/Skeleton";
import { pillarColor } from "@/components/ui/PillarChip";

/**
 * Ingest-loading choreography (Task 13, `docs/PLAN-V1.md` §1's "important
 * part"): a paper node plus ghost-pillar outlines, pulsing before any AI has
 * run. Built entirely from the existing `Skeleton` primitive's
 * `.motion-shimmer` class (`app/globals.css`) -- no third shimmer mechanism.
 * Dropped into `/upload`'s post-submit state as a stand-in for "ingest in
 * progress" (plan.md's "skeleton graph appears in under 300ms" beat).
 */
export function SkeletonGraph({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Building your reading graph"
      className={className}
    >
      <div className="flex flex-col items-center gap-6 py-10">
        {/* Paper node */}
        <Skeleton className="h-10 w-40 rounded-md" />

        {/* Ghost pillars fanning out from the paper node */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-6 w-20 rounded-full border"
              style={{ borderColor: pillarColor(i + 1) }}
            />
          ))}
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Building your reading graph&hellip;
        </p>
      </div>
    </div>
  );
}
