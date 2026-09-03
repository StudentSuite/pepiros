"use client";

import { useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ExternalLink, Plus } from "lucide-react";
import type { GhostCitationNodeType } from "./types";

/**
 * A paper found via citation-graph expansion (plan.md §6.2,
 * lib/services/citationExpand.ts -- OpenAlex). Sits dimmed/dashed at the canvas
 * edge, rendered only when the user asks for it from its source paper node.
 *
 * "Add to workspace" used to POST to /api/expand and always come back 501,
 * because turning a ghost into a real paper needs the ingest pipeline --
 * which now exists (lib/services/ingest.ts). It only appears when OpenAlex
 * actually reports a directly fetchable open-access PDF (`pdfUrl`); a
 * paywalled or unindexed work still only offers the OpenAlex link, since
 * there's genuinely nothing to ingest.
 *
 * Issue #165: this used to discard the real jobId POST /api/ingest returns
 * and just flip to a static "queued -- check the workspace shortly" label,
 * a blind fire-and-forget worse than the main upload page's real SSE-driven
 * progress for the exact same job. Now follows the same job over
 * GET /api/jobs/[id]'s SSE stream and reflects its real terminal state.
 */
export function GhostCitationNode({ data }: NodeProps<GhostCitationNodeType>) {
  const { title, authors, year, direction, url, pdfUrl, workspaceId } = data;
  const [state, setState] = useState<"idle" | "pending" | "queued" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const source = new EventSource(`/api/jobs/${jobId}`);
    source.addEventListener("progress", (e) => {
      const payload = JSON.parse((e as MessageEvent).data) as { status: string; error?: string | null };
      if (payload.status === "done") {
        setState("done");
      } else if (payload.status === "failed") {
        setError(payload.error ?? "Ingest failed.");
        setState("error");
      }
    });
    // Issue #190: this used to just close the stream on any transport-level
    // error (dropped connection, non-2xx) with no state change -- since the
    // "Add to workspace" button is hidden for state "queued", that left the
    // user stuck on "Parsing this paper..." forever with no way to know it
    // failed or retry.
    source.addEventListener("error", () => {
      source.close();
      setError("Lost connection while checking this job -- try again.");
      setState("error");
    });
    return () => source.close();
  }, [jobId]);

  async function addToWorkspace() {
    if (!pdfUrl) return;
    setState("pending");
    setError(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, url: pdfUrl }),
      });
      const body = (await res.json().catch(() => null)) as { detail?: string; error?: string; jobId?: string } | null;
      if (!res.ok) throw new Error(body?.detail ?? body?.error ?? `Could not queue (${res.status}).`);
      if (body?.jobId) setJobId(body.jobId);
      setState("queued");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue this paper.");
      setState("error");
    }
  }

  return (
    <div className="w-56 rounded border border-dashed border-ink-faint bg-surface-sunken px-3 py-2 opacity-60 transition-opacity hover:opacity-100">
      <Handle type="target" position={Position.Top} className="!bg-ink-faint" />
      <div className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
        {direction === "cites" ? "cites this workspace" : "cited by this workspace"}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="nodrag nopan mt-1 block font-sans text-xs font-medium leading-snug text-ink-muted hover:text-ink hover:underline"
      >
        {title}
      </a>
      <div className="mt-0.5 font-serif text-2xs text-ink-faint">
        {authors.join(", ")}
        {year ? ` · ${year}` : ""}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="nodrag nopan flex items-center gap-1 font-mono text-2xs uppercase tracking-wide text-ink-faint hover:text-ink"
        >
          View on OpenAlex
          <ExternalLink size={10} strokeWidth={1.5} aria-hidden />
        </a>
        {pdfUrl && state !== "queued" && state !== "done" && (
          <button
            type="button"
            onClick={() => void addToWorkspace()}
            disabled={state === "pending"}
            className="nodrag nopan flex items-center gap-1 font-mono text-2xs uppercase tracking-wide text-accent-text hover:text-ink disabled:opacity-60"
          >
            <Plus size={10} strokeWidth={1.5} aria-hidden />
            {state === "pending" ? "Queuing…" : "Add to workspace"}
          </button>
        )}
      </div>
      {state === "queued" && (
        <p className="mt-1.5 font-sans text-2xs leading-snug text-ink-faint">Parsing this paper…</p>
      )}
      {/* Issue #386: neither was announced to a screen reader. */}
      {state === "done" && (
        <p role="status" className="mt-1.5 font-sans text-2xs leading-snug text-located">
          Added -- refresh the canvas to see it.
        </p>
      )}
      {state === "error" && error && (
        <p role="alert" className="mt-1.5 font-sans text-2xs leading-snug text-unsupported">{error}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-ink-faint" />
    </div>
  );
}
