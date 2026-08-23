import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { Popover } from "@/components/ui/Popover";
import { IconButton } from "@/components/ui/IconButton";
import { X } from "lucide-react";
import type { ChatMessageCitation } from "./MessageList";

/**
 * Small popover shown for a citation id: the tier badge plus the located
 * quote (or, for the "unsupported"/dropped case, an honest note instead of a
 * quote). The banned-word rule (docs/PLAN-V1.md §4) is narrower than "never
 * render the string 'verified'": a claim's TIER must always read "quote
 * located"/"paraphrase"/"unsupported", never "verified" -- but "dropped on
 * re-verification" below describes the deterministic recheck ACTION itself
 * (the same mechanism lib/services/verify.ts and the verify_claim MCP tool
 * are named after), not a status asserted about the claim, and is used
 * identically in NodeInspector.tsx and EvidenceList.tsx for the same event.
 * Positioning, outside-click, and Escape come from the shared Popover
 * primitive.
 *
 * Issue #210: takes this message's own re-verified ChatMessageCitation, not
 * a graph Evidence row -- see CitationChip's doc comment for why a global
 * workspace.evidence lookup was the wrong data source for a chat answer.
 */
export function SourcePopover({
  citation,
  onClose,
}: {
  citation: ChatMessageCitation;
  onClose: () => void;
}) {
  return (
    <Popover open onClose={onClose} label={`Source for citation ${citation.refId}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <RefChip refId={citation.refId} />
          <EvidenceBadge tier={citation.tier} />
        </div>
        <IconButton icon={X} label="Close" onClick={onClose} className="h-6 w-6" />
      </div>
      {citation.quote ? (
        <p className="font-serif text-[13px] italic leading-snug text-ink">
          &ldquo;{citation.quote}&rdquo;
        </p>
      ) : (
        <p className="font-sans text-xs text-ink-muted">
          Dropped on re-verification -- the claimed quote didn&apos;t match closely enough to the
          source to clear the paraphrase floor.
        </p>
      )}
      {/* Issue #324: 10px was below the accessible text-size floor. */}
      <p className="mt-2 font-mono text-[11px] text-ink-faint">
        match {Math.round(citation.matchScore * 100)}%
      </p>
    </Popover>
  );
}
