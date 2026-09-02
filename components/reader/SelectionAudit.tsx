"use client";

import { useEffect, useState, type RefObject } from "react";
import { leafNodesCitingChunks } from "@/lib/reader/selectionAudit";
import { toast } from "sonner";
import type { Evidence, GraphNode } from "@/types/anchor";

interface AuditResponse {
  sentences: Array<{ bestChunkId: string | null }>;
}

/**
 * Issue #294: a shipped feature (lib/grounding/reverseAudit.ts, wired
 * through POST /api/audit) with no front door besides the Audit tab.
 * Select text in the source pane, get a floating action:
 *
 * - "Claims citing this" runs the real audit path over the selection
 *   (not a chunk-id lookup off the active chunk -- the same verifier a
 *   pasted external summary goes through) and selects/scrolls the
 *   matching claims into view in the claims pane.
 * - "Ask" opens the chat dock scoped to the selection.
 *
 * Detects a selection anywhere inside `containerRef` via the
 * `selectionchange` event rather than mouseup alone, so a keyboard-driven
 * selection (Shift+Arrow) also surfaces the toolbar.
 */
export function SelectionAudit({
  workspaceId,
  containerRef,
  leafNodes,
  evidence,
  onFoundClaim,
  onAsk,
}: {
  workspaceId: string;
  containerRef: RefObject<HTMLElement | null>;
  leafNodes: GraphNode[];
  evidence: Evidence[];
  onFoundClaim: (nodeId: string) => void;
  onAsk: (text: string) => void;
}) {
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      const container = containerRef.current;
      if (!sel || sel.isCollapsed || !container) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!text || !range || !container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      setSelection({ text, rect: range.getBoundingClientRect() });
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [containerRef]);

  function clearSelection() {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  async function claimsCitingThis() {
    if (!selection) return;
    setPending(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, text: selection.text }),
      });
      if (!res.ok) throw new Error(`Audit failed (${res.status}).`);
      const data = (await res.json()) as AuditResponse;
      const chunkIds = new Set(
        data.sentences.map((s) => s.bestChunkId).filter((id): id is string => id !== null),
      );
      const matches = leafNodesCitingChunks(leafNodes, evidence, chunkIds);
      if (matches.length === 0) {
        toast("No claims cite this passage yet.");
      } else {
        onFoundClaim(matches[0]!.id);
        if (matches.length > 1) {
          toast.success(`${matches.length} claims cite this -- showing the first.`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check this passage.");
    } finally {
      setPending(false);
      clearSelection();
    }
  }

  function ask() {
    if (!selection) return;
    onAsk(`Is this true: "${selection.text}"`);
    clearSelection();
  }

  if (!selection) return null;

  return (
    <div
      className="glass fixed z-50 flex gap-1 rounded-md border border-border-strong px-1.5 py-1 shadow-e-2"
      style={{ top: selection.rect.bottom + 8, left: selection.rect.left }}
    >
      <button
        type="button"
        onClick={() => void claimsCitingThis()}
        disabled={pending}
        className="rounded px-2 py-1 font-sans text-xs text-ink-muted transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
      >
        {pending ? "Checking…" : "Claims citing this"}
      </button>
      <button
        type="button"
        onClick={ask}
        className="rounded px-2 py-1 font-sans text-xs text-ink-muted transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
      >
        Ask
      </button>
    </div>
  );
}
