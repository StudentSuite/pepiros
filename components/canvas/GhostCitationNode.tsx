"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GhostCitationNodeType } from "./types";

/**
 * A paper found via citation-graph expansion (plan.md §6.2, lib/services/citationExpand.ts
 * -- OpenAlex, wired up in GraphCanvas) that isn't in the workspace yet. Sits dimmed/dashed
 * at the canvas edge. "Add to workspace" calls the real POST /api/expand endpoint, which
 * honestly reports 501 -- there is no ingest pipeline yet to actually turn a ghost into a
 * real paper, so this surfaces that instead of silently doing nothing.
 */
export function GhostCitationNode({ data }: NodeProps<GhostCitationNodeType>) {
  const { title, authors, year, direction, url } = data;
  const [status, setStatus] = useState<"idle" | "pending" | "not_implemented">("idle");

  async function handleAdd() {
    setStatus("pending");
    try {
      const res = await fetch("/api/expand", { method: "POST" });
      if (res.status === 501) {
        setStatus("not_implemented");
        return;
      }
    } catch {
      // fall through to not_implemented -- there's no ingest pipeline behind
      // this button regardless of how the request failed.
    }
    setStatus("not_implemented");
  }

  return (
    <div className="w-56 rounded border border-dashed border-ink-faint bg-surface-sunken px-3 py-2 opacity-60">
      <Handle type="target" position={Position.Top} className="!bg-ink-faint" />
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {direction === "cites" ? "cites this workspace" : "cited by this workspace"}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block font-sans text-[12px] font-medium leading-snug text-ink-muted hover:text-ink hover:underline"
      >
        {title}
      </a>
      <div className="mt-0.5 font-serif text-[11px] text-ink-faint">
        {authors.join(", ")}
        {year ? ` · ${year}` : ""}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={status !== "idle"}
        className="mt-2 w-full rounded border border-border-strong bg-surface-raised px-2 py-1 font-sans text-[11px] text-ink-muted hover:border-ink-muted hover:text-ink disabled:opacity-70"
      >
        {status === "idle" && "Add to workspace"}
        {status === "pending" && "Adding..."}
        {status === "not_implemented" && "Ingestion not built yet"}
      </button>
      <Handle type="source" position={Position.Bottom} className="!bg-ink-faint" />
    </div>
  );
}
