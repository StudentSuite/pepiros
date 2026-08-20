import type { Evidence } from "@/types/anchor";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { Popover } from "@/components/ui/Popover";
import { IconButton } from "@/components/ui/IconButton";
import { X } from "lucide-react";

/**
 * Small popover shown for a citation id: the tier badge plus the located
 * quote (or, for the "unsupported"/dropped case, an honest note instead of a
 * quote -- never render "verified" here, see plan.md §4). Positioning,
 * outside-click, and Escape now come from the shared Popover primitive.
 */
export function SourcePopover({
  evidence,
  onClose,
}: {
  evidence: Evidence;
  onClose: () => void;
}) {
  return (
    <Popover open onClose={onClose} label={`Source for citation ${evidence.refId}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <RefChip refId={evidence.refId} />
          <EvidenceBadge tier={evidence.tier} />
        </div>
        <IconButton icon={X} label="Close" onClick={onClose} className="h-6 w-6" />
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
    </Popover>
  );
}
