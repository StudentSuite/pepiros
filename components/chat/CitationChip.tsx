"use client";

import { useRef, useState } from "react";
import { RefChip } from "@/components/ui/RefChip";
import { SourcePopover } from "./SourcePopover";
import { useWorkspaceStore } from "@/lib/store/workspace";

const HOVER_DELAY_MS = 140;

/**
 * Inline clickable chip for a citation id inside chat prose. Hovering opens
 * the SourcePopover after a 140ms delay (docs/PLAN-V1.md §9.3) so a mouse
 * passing over prose doesn't pop every chip it crosses; clicking opens it
 * immediately and also selects the owning node so an inspector elsewhere on
 * the page picks it up.
 */
export function CitationChip({ refId }: { refId: string }) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  const evidence = workspace?.evidence.find((e) => e.refId === refId);

  function handleMouseEnter() {
    hoverTimer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  }
  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  }

  return (
    <span className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        onClick={() => {
          if (evidence) selectNode(evidence.nodeId);
          setOpen((o) => !o);
        }}
        className="align-baseline"
      >
        <RefChip refId={refId} className="cursor-pointer hover:border-ink-muted hover:text-ink" />
      </button>
      {open && evidence && (
        <SourcePopover evidence={evidence} onClose={() => setOpen(false)} />
      )}
    </span>
  );
}
