"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GhostCitationNodeType } from "./types";

/**
 * A paper found via citation-graph expansion (plan.md §6.2) that isn't in the
 * workspace yet -- OpenAlex-powered in the real system, not wired up this pass. Sits
 * dimmed/dashed at the canvas edge; "Add to workspace" is a stub (no ingestion
 * pipeline exists yet) so it just logs, per the task brief.
 */
export function GhostCitationNode({ data }: NodeProps<GhostCitationNodeType>) {
  const { title, authors, year, direction } = data;
  return (
    <div className="w-56 rounded border border-dashed border-ink-faint bg-surface-sunken px-3 py-2 opacity-60">
      <Handle type="target" position={Position.Top} className="!bg-ink-faint" />
      <div className="font-sans text-[10px] uppercase tracking-wide text-ink-faint">
        {direction === "cites" ? "cites this workspace" : "cited by this workspace"}
      </div>
      <div className="mt-1 font-sans text-[12px] font-medium leading-snug text-ink-muted">{title}</div>
      <div className="mt-0.5 font-serif text-[11px] text-ink-faint">
        {authors.join(", ")}
        {year ? ` · ${year}` : ""}
      </div>
      <button
        type="button"
        onClick={() => console.log("Add to workspace (stub):", { title, authors, year })}
        className="mt-2 w-full rounded border border-border-strong bg-surface-raised px-2 py-1 font-sans text-[11px] text-ink-muted hover:border-ink-muted hover:text-ink"
      >
        Add to workspace
      </button>
      <Handle type="source" position={Position.Bottom} className="!bg-ink-faint" />
    </div>
  );
}
