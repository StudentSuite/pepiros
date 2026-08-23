"use client";

import { useState } from "react";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { GraphEdge, GraphNode } from "@/types/anchor";
import { InlineRefs, stripRefMarkers } from "@/components/canvas/InlineRefs";

interface PathStep {
  node: GraphNode;
  /** How this step connects to the thread node -- shown as the one-line reason. */
  edgeKind: GraphEdge["kind"];
}

/** derived_from edges come first (the path's grounding), relates second --
 *  a fixed, deterministic order, not a graph traversal/ranking algorithm. */
const EDGE_KIND_ORDER: Record<string, number> = { derived_from: 0, relates: 1 };

function buildPath(threadNode: GraphNode, edges: GraphEdge[], nodes: GraphNode[]): PathStep[] {
  const connected = edges.filter(
    (e) =>
      (e.sourceId === threadNode.id || e.targetId === threadNode.id) &&
      (e.kind === "derived_from" || e.kind === "relates"),
  );
  const steps: PathStep[] = [];
  for (const edge of connected) {
    const otherId = edge.sourceId === threadNode.id ? edge.targetId : edge.sourceId;
    const node = nodes.find((n) => n.id === otherId);
    if (node) steps.push({ node, edgeKind: edge.kind });
  }
  return steps.sort((a, b) => (EDGE_KIND_ORDER[a.edgeKind] ?? 99) - (EDGE_KIND_ORDER[b.edgeKind] ?? 99));
}

/**
 * Ordered stepper for the workspace's "thread"-type node(s) (deterministic
 * reading path, replaces the cut Research Mentor per plan.md §11). A rail,
 * never a modal, and dismissible.
 */
export function ReadingPath() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState(0);

  if (!workspace || dismissed) return null;

  const threadNodes = workspace.nodes.filter((n) => n.type === "thread");
  if (threadNodes.length === 0) return null;

  const thread = threadNodes[0]!;
  const steps = buildPath(thread, workspace.edges, workspace.nodes);
  if (steps.length === 0) return null;

  const current = steps[Math.min(position, steps.length - 1)]!;

  return (
    <div className="rounded border border-border bg-surface-raised p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Reading path
          </p>
          <p className="font-sans text-sm text-ink">{thread.title}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss reading path"
          className="-m-2.5 grid size-11 shrink-0 place-items-center rounded-md font-sans text-xs text-ink-faint transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
        >
          x
        </button>
      </div>

      {/* Issue #227: this rendered thread.bodyMd raw, so an inline `[^eN]`
          citation marker printed literally in the card. Markers come out of
          the prose and resolve to chips, the same treatment node bodies get
          on the canvas -- and the same reason FlashcardDeck strips them. */}
      <p className="mb-2 font-sans text-xs text-ink-muted">
        {stripRefMarkers(thread.bodyMd)}
      </p>
      <InlineRefs
        bodyMd={thread.bodyMd}
        evidence={workspace.evidence}
        className="mb-3 flex flex-wrap gap-1"
      />

      {/* The step title used to sit in the same row as Previous/Next, leaving
          it only whatever width was left after two nav buttons in a ~256px
          rail -- as little as ~65px, which wrapped a title like "Sleep onset
          latency drop" across four lines. Giving it the full row width and
          putting nav controls on their own row below fixes that directly. */}
      <button
        type="button"
        onClick={() => selectNode(current.node.id)}
        className={clsx(
          "block w-full rounded border border-border-strong bg-surface-sunken px-2 py-1.5 text-left font-sans text-sm text-ink",
          "hover:border-ink-muted",
        )}
      >
        {current.node.title}
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={position === 0}
          onClick={() => setPosition((p) => Math.max(0, p - 1))}
          className="rounded border border-border-strong px-2 py-1 font-sans text-xs text-ink-muted disabled:opacity-30"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={position >= steps.length - 1}
          onClick={() => setPosition((p) => Math.min(steps.length - 1, p + 1))}
          className="rounded border border-border-strong px-2 py-1 font-sans text-xs text-ink-muted disabled:opacity-30"
        >
          Next
        </button>
      </div>

      <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
        {position + 1} of {steps.length}
      </p>
    </div>
  );
}
