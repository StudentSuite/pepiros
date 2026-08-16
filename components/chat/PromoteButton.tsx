"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, Loader2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { Evidence, GraphNode } from "@/types/anchor";
import type { ChatMessage } from "./MessageList";

interface CreateNodeApiResponse {
  nodeId: string;
  deepLink: string;
  /** The submitted bodyMd with real evidence markers already bound in -- see
   *  lib/services/nodes.ts's CreateNodeResult.bodyMd doc comment. */
  bodyMd: string;
  lowConfidence: boolean;
  droppedRefs: string[];
  evidence: Array<Omit<Evidence, "id"> & { id: string }>;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * "Promote this answer into a new graph node" (plan.md §7's MCP demo beat).
 * Calls the same create_node path the MCP tool uses (POST /api/nodes ->
 * lib/services/nodes.ts createNode()), which re-verifies every claim
 * server-side against the corpus -- a promoted node can come back
 * low-confidence if a citation doesn't hold up, exactly like any other node.
 * No parent/persistence yet (fixture-backed data seam), so the node is added
 * to the client-side workspace store, same as everything else read from it.
 */
export function PromoteButton({ message }: { message: ChatMessage }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [result, setResult] = useState<{ deepLink: string; lowConfidence: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasCitations = message.segments.some((s) => s.kind === "citation");
  if (message.role !== "assistant" || !hasCitations) return null;

  async function promote() {
    if (!workspace) return;
    setState("pending");
    setError(null);

    const citationByRef = new Map((message.citations ?? []).map((c) => [c.refId, c]));
    const claims: Array<{ refs: string[]; quote: string }> = [];
    const refToMarkerIndex = new Map<string, number>();

    for (const seg of message.segments) {
      if (seg.kind !== "citation" || refToMarkerIndex.has(seg.refId)) continue;
      const quote = citationByRef.get(seg.refId)?.quote;
      if (!quote) continue;
      refToMarkerIndex.set(seg.refId, claims.length);
      claims.push({ refs: [seg.refId], quote });
    }

    if (claims.length === 0) {
      setError("None of this answer's citations located a real quote, so there is nothing to ground a node in.");
      setState("error");
      return;
    }

    const title = message.question ? truncate(message.question, 80) : "Chat answer";
    const bodyMd = message.segments
      .map((seg) => {
        if (seg.kind === "text") return seg.text;
        const index = refToMarkerIndex.get(seg.refId);
        return index === undefined ? `[${seg.refId}]` : `[^n${index}]`;
      })
      .join("");

    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, title, bodyMd, claims }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(body?.detail ?? `Promote failed (${res.status}).`);
      }

      const data = (await res.json()) as CreateNodeApiResponse;

      const node: GraphNode = {
        id: data.nodeId,
        workspaceId: workspace.id,
        type: "leaf",
        title,
        bodyMd: data.bodyMd,
        pillarIndex: null,
        x: 0,
        y: 0,
        paperId: workspace.papers[0]?.id ?? null,
        stale: false,
      };
      addNode(node, data.evidence);

      setResult({ deepLink: data.deepLink, lowConfidence: data.lowConfidence });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promote failed.");
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="flex items-center gap-2 font-sans text-[11px]">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded border px-2 py-1",
            result.lowConfidence ? "border-paraphrase/60 text-paraphrase" : "border-located/60 text-located",
          )}
        >
          <Icon icon={Check} size="xs" className="animate-[node-appear_var(--dur-base)_var(--ease-out)]" />
          {result.lowConfidence ? "Promoted (low confidence)" : "Promoted to graph"}
        </span>
        <Link href={result.deepLink} className="text-ink-muted underline underline-offset-2 hover:text-ink">
          View in graph
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={state === "pending"}
        onClick={() => void promote()}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-sans text-[11px] transition duration-fast ease-out",
          "border-border-strong text-ink-muted hover:border-ink-muted hover:text-ink disabled:opacity-60",
        )}
      >
        {state === "pending" && <Icon icon={Loader2} size="xs" className="animate-spin" />}
        {state === "pending" ? "Verifying…" : "Promote to node"}
      </button>
      {error && <span className="max-w-[220px] font-sans text-[11px] text-unsupported">{error}</span>}
    </div>
  );
}
