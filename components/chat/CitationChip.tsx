"use client";

import { useState } from "react";
import { RefChip } from "@/components/ui/RefChip";
import { SourcePopover } from "./SourcePopover";
import { useWorkspaceStore } from "@/lib/store/workspace";

/**
 * Inline clickable chip for a citation id inside chat prose. Clicking
 * selects the owning node in the shared store (so an inspector elsewhere on
 * the page can pick it up) and toggles a SourcePopover with the located
 * quote.
 */
export function CitationChip({ refId }: { refId: string }) {
  const [open, setOpen] = useState(false);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  const evidence = workspace?.evidence.find((e) => e.refId === refId);

  return (
    <span className="relative inline-block">
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
