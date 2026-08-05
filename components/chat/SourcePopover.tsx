import type { Evidence } from "@/types/anchor";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { Panel } from "@/components/ui/Panel";

/**
 * Small popover shown for a citation id: the tier badge plus the located
 * quote (or, for the "unsupported"/dropped case, an honest note instead of a
 * quote -- never render "verified" here, see plan.md §4).
 */
export function SourcePopover({
  evidence,
  onClose,
}: {
  evidence: Evidence;
  onClose?: () => void;
}) {
  return (
    <Panel
      role="tooltip"
      className="absolute left-0 top-full z-50 mt-1 w-72 p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <RefChip refId={evidence.refId} />
          <EvidenceBadge tier={evidence.tier} />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-sans text-xs text-ink-faint hover:text-ink"
          >
            x
          </button>
        )}
      </div>
      {evidence.anchor ? (
        <p className="font-serif text-[13px] italic leading-snug text-ink">
          &ldquo;{evidence.anchor.quote}&rdquo;
        </p>
      ) : (
        <p className="font-sans text-xs text-ink-muted">
          Dropped on re-verification -- the claimed quote didn&apos;t match closely enough to the
          source to clear the paraphrase floor.
        </p>
      )}
      <p className="mt-2 font-mono text-[10px] text-ink-faint">
        match {Math.round(evidence.matchScore * 100)}%
      </p>
    </Panel>
  );
}
