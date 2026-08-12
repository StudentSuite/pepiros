"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ExternalLink } from "lucide-react";
import type { GhostCitationNodeType } from "./types";

/**
 * A paper found via citation-graph expansion (plan.md §6.2,
 * lib/services/citationExpand.ts -- OpenAlex). Sits dimmed/dashed at the canvas
 * edge, rendered only when the user asks for it from its source paper node.
 *
 * This used to carry an "Add to workspace" button that POSTed to /api/expand and
 * always came back 501, because turning a ghost into a real paper needs the
 * ingest pipeline. Honestly reporting a 501 is the right pattern for an endpoint
 * that might work; a control that can *never* succeed is just a broken button,
 * so the affordance is now the one thing that does work -- opening the paper on
 * OpenAlex. It comes back when there's an ingest pipeline for it to call.
 */
export function GhostCitationNode({ data }: NodeProps<GhostCitationNodeType>) {
  const { title, authors, year, direction, url } = data;

  return (
    <div className="w-56 rounded border border-dashed border-ink-faint bg-surface-sunken px-3 py-2 opacity-60 transition-opacity hover:opacity-100">
      <Handle type="target" position={Position.Top} className="!bg-ink-faint" />
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {direction === "cites" ? "cites this workspace" : "cited by this workspace"}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="nodrag nopan mt-1 block font-sans text-[12px] font-medium leading-snug text-ink-muted hover:text-ink hover:underline"
      >
        {title}
      </a>
      <div className="mt-0.5 font-serif text-[11px] text-ink-faint">
        {authors.join(", ")}
        {year ? ` · ${year}` : ""}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="nodrag nopan mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint hover:text-ink"
      >
        View on OpenAlex
        <ExternalLink size={10} strokeWidth={1.5} aria-hidden />
      </a>
      <Handle type="source" position={Position.Bottom} className="!bg-ink-faint" />
    </div>
  );
}
