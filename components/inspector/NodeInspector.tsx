"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { Evidence } from "@/types/anchor";
import { RefChip } from "@/components/ui/RefChip";
import { PillarChip } from "@/components/ui/PillarChip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EvidenceList } from "./EvidenceList";
import { NodeEditor } from "./NodeEditor";

const MARKER_RE = /\[\^([a-zA-Z0-9_-]+)\]/g;

/**
 * Turns inline `[^e1]`-style citation markers in bodyMd into RefChips looked
 * up against this node's evidence (by Evidence.id, not refId). A marker
 * whose evidence resolved to "unsupported" still renders -- that's the
 * exact fixture case ("e6" on n-p2-limitations-leaf-1) this view should
 * surface, not hide. A marker with no matching evidence row at all is the
 * render-error invariant from plan.md §5 -- flagged distinctly here rather
 * than thrown, since this is a read surface, not CI.
 */
function renderBodyWithCitations(bodyMd: string, evidence: Evidence[]): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MARKER_RE.lastIndex = 0;
  while ((match = MARKER_RE.exec(bodyMd)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{bodyMd.slice(lastIndex, match.index)}</span>);
    }
    const evidenceId = match[1];
    const row = evidence.find((e) => e.id === evidenceId);
    if (row) {
      parts.push(
        <span
          key={key++}
          className={clsx("mx-0.5 inline-flex", row.tier === "unsupported" && "opacity-70")}
          title={row.tier === "unsupported" ? "resolved unsupported -- dropped on re-verification" : undefined}
        >
          <RefChip
            refId={row.refId}
            className={row.tier === "unsupported" ? "border-unsupported/60 text-unsupported" : undefined}
          />
        </span>,
      );
    } else {
      parts.push(
        <span
          key={key++}
          title="This citation marker has no matching evidence row"
          className="mx-0.5 rounded border border-unsupported/60 px-1 font-mono text-[11px] text-unsupported"
        >
          {match[0]}
        </span>,
      );
    }
    lastIndex = MARKER_RE.lastIndex;
  }
  if (lastIndex < bodyMd.length) {
    parts.push(<span key={key++}>{bodyMd.slice(lastIndex)}</span>);
  }
  return parts;
}

type Tab = "content" | "evidence";

/**
 * Right-drawer inspector bound to the shared store's selectedNodeId. Shows
 * title, bodyMd (citation markers -> RefChips), and the node's evidence
 * list. `readOnly` hides the edit affordance for the share-link view.
 */
export function NodeInspector({ readOnly = false }: { readOnly?: boolean }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const [tab, setTab] = useState<Tab>("content");
  const [editing, setEditing] = useState(false);

  if (!workspace) {
    return <p className="font-sans text-xs text-ink-faint">Loading workspace...</p>;
  }

  const node = workspace.nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <p className="font-sans text-xs text-ink-faint">
        Select a node to read it here, beside its source.
      </p>
    );
  }

  const nodeEvidence = workspace.evidence.filter((e) => e.nodeId === node.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-faint">
          {node.type}
        </span>
        {node.pillarIndex !== null && <PillarChip pillarIndex={node.pillarIndex} label={`pillar ${node.pillarIndex}`} />}
        {node.stale && (
          <span className="rounded border border-unsupported/60 px-1.5 py-0.5 font-sans text-[10px] text-unsupported">
            stale
          </span>
        )}
      </div>

      <h2 className="font-serif text-lg text-ink">{node.title}</h2>

      <Tabs
        tabs={[
          { value: "content", label: "content" },
          { value: "evidence", label: "evidence", badge: nodeEvidence.length || undefined },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        trailing={
          !readOnly && tab === "content" ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>
              {editing ? "Cancel edit" : "Edit"}
            </Button>
          ) : undefined
        }
      />

      {tab === "content" &&
        (editing ? (
          <NodeEditor
            initialContent={node.bodyMd}
            onCancel={() => setEditing(false)}
            onSave={() => setEditing(false)}
          />
        ) : (
          <p className="font-serif text-sm leading-relaxed text-ink">
            {renderBodyWithCitations(node.bodyMd, nodeEvidence)}
          </p>
        ))}

      {tab === "evidence" && <EvidenceList evidence={nodeEvidence} />}
    </div>
  );
}
