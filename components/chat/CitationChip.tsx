"use client";

import { useRef, useState } from "react";
import { RefChip } from "@/components/ui/RefChip";
import { SourcePopover } from "./SourcePopover";
import type { ChatMessageCitation } from "./MessageList";

const HOVER_DELAY_MS = 140;

/**
 * Inline clickable chip for a citation id inside chat prose. Hovering opens
 * the SourcePopover after a 140ms delay (docs/PLAN-V1.md §9.3) so a mouse
 * passing over prose doesn't pop every chip it crosses.
 *
 * Issue #210: this used to look up "evidence" by scanning the *global* graph
 * workspace.evidence array for the first entry whose refId string matched --
 * a different data source than what actually backs this answer, and
 * ambiguous besides (the same refId can legitimately appear on multiple
 * nodes with different tiers). `citation` is this message's own re-verified
 * citation for this refId (message.citations from /api/chat), the only
 * source of truth for what this specific answer actually cited. Dropped the
 * old click-to-selectNode side effect along with it: a chat citation isn't
 * reliably tied to any existing graph node (that only happens via "Promote
 * to node"), so there's no node id here to select in the first place.
 */
export function CitationChip({ refId, citation }: { refId: string; citation: ChatMessageCitation | undefined }) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    hoverTimer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  }
  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  }

  return (
    <span className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="align-baseline">
        <RefChip refId={refId} className="cursor-pointer hover:border-ink-muted hover:text-ink" />
      </button>
      {open && citation && <SourcePopover citation={citation} onClose={() => setOpen(false)} />}
    </span>
  );
}
