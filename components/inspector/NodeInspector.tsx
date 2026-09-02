"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { Evidence, GraphEdge, GraphNode } from "@/types/anchor";
import { RefChip } from "@/components/ui/RefChip";
import { PillarChip } from "@/components/ui/PillarChip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { EvidenceList } from "./EvidenceList";
import { NodeEditor } from "./NodeEditor";

interface ExpandNodeApiResponse {
  node: GraphNode;
  edge: GraphEdge;
  evidence: Array<Omit<Evidence, "id"> & { id: string }>;
  deepLink: string;
  lowConfidence: boolean;
}

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
  const updateNodeBody = useWorkspaceStore((s) => s.updateNodeBody);
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const removeNode = useWorkspaceStore((s) => s.removeNode);
  const [tab, setTab] = useState<Tab>("content");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFollowup, setPendingFollowup] = useState<string | null>(null);
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Issue #191: this used to only ever be set to true/false by explicit user
  // action, never reset on selection change. Clicking a different node while
  // `editing` was still true left NodeEditor's Tiptap instance mounted with
  // the *previous* node's stale content (useEditor only applies its initial
  // content once), so hitting Save then PATCHed the new node's id with the
  // old node's text -- silent cross-node data corruption. Also covers
  // issue #193: the panel swapping to a new subject (a followup click, or
  // any other selection change) moves focus to the new node's title instead
  // of leaving it stranded on an unmounted trigger button.
  useEffect(() => {
    setEditing(false);
    setSaving(false);
    setConfirmingDelete(false);
    setPendingFollowup(null);
    setFollowupError(null);
    titleRef.current?.focus();
  }, [selectedNodeId]);

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
  // Captured here (rather than read as `node.id`/`workspace.id` inside the
  // closure below) because TS's control-flow narrowing from the `if (!node)`/
  // `if (!workspace)` guards above doesn't carry into a nested function body.
  const nodeId = node.id;
  const workspaceId = workspace.id;

  async function askFollowup(question: string) {
    setPendingFollowup(question);
    setFollowupError(null);
    try {
      const res = await fetch(`/api/nodes/${encodeURIComponent(nodeId)}/expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, question }),
      });
      const body = (await res.json().catch(() => null)) as ExpandNodeApiResponse | { detail?: string } | null;
      if (!res.ok) {
        throw new Error((body as { detail?: string } | null)?.detail ?? `Could not answer that (${res.status}).`);
      }
      const data = body as ExpandNodeApiResponse;
      addNode(data.node, data.evidence, [data.edge]);
      selectNode(data.node.id);
    } catch (err) {
      setFollowupError(err instanceof Error ? err.message : "Could not answer that follow-up.");
    } finally {
      setPendingFollowup(null);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/nodes/${encodeURIComponent(nodeId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => null)) as { detail?: string; staleNodeIds?: string[] } | null;
      if (!res.ok) throw new Error(body?.detail ?? `Could not delete this node (${res.status}).`);
      removeNode(nodeId, body?.staleNodeIds ?? []);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this node.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

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

      <h2
        ref={titleRef}
        id="node-inspector-title"
        tabIndex={-1}
        className="font-serif text-xl leading-snug text-ink outline-none"
      >
        {node.title}
      </h2>

      <Tabs
        tabs={[
          { value: "content", label: "content" },
          { value: "evidence", label: "evidence", badge: nodeEvidence.length || undefined },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        trailing={
          !readOnly && tab === "content" ? (
            // Issue #194: the Edit/Cancel-edit toggle is now the *same*
            // Button element at the same position in both states (only its
            // label/onClick differ), with Delete as a sibling that appears
            // only alongside it. Previously the !editing state wrapped two
            // buttons in a <div> while editing rendered one standalone
            // <Button> in the same JSX slot -- a different element shape at
            // the same position, so React unmounted/remounted the whole
            // subtree on every toggle and dropped focus to <body>.
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => setEditing((e) => !e)}>
                {editing ? "Cancel edit" : "Edit"}
              </Button>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {tab === "content" &&
        (editing ? (
          <NodeEditor
            key={node.id}
            initialContent={node.bodyMd}
            saving={saving}
            onCancel={() => setEditing(false)}
            onSave={async (html) => {
              setSaving(true);
              try {
                const res = await fetch(`/api/nodes/${encodeURIComponent(node.id)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workspaceId: workspace.id, bodyMd: html }),
                });
                if (!res.ok) throw new Error(`Save failed (${res.status})`);
                // Server response, not the local `html`: updateNodeBody()
                // re-verifies every evidence row against the edited text and
                // may strip a now-unsupported citation marker from bodyMd or
                // downgrade its tier (issue #77) -- applying our own copy
                // instead would show a citation the server just dropped.
                const { node: savedNode, evidence: savedEvidence } = (await res.json()) as {
                  node: GraphNode;
                  evidence: Evidence[];
                };
                updateNodeBody(node.id, savedNode.bodyMd, savedEvidence);
                setEditing(false);
                toast.success("Saved");
              } catch {
                toast.error("Couldn't save, try again");
              } finally {
                setSaving(false);
              }
            }}
          />
        ) : (
          // Node bodies are read, not scanned, so they use the same measure and
          // leading as an article body rather than panel-sized text.
          <p className="max-w-[38rem] font-sans text-[15px] leading-[1.7] text-ink">
            {renderBodyWithCitations(node.bodyMd, nodeEvidence)}
          </p>
        ))}

      {/* Followup chips (docs/PLAN-V1.md §9.3): click one to generate and
          verify a real child node via POST /api/nodes/[id]/expand, same
          re-verification contract as create_node -- not a canned response. */}
      {tab === "content" && !editing && !readOnly && node.followups && node.followups.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Go deeper</p>
          <div className="flex flex-wrap gap-1.5">
            {node.followups.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void askFollowup(question)}
                disabled={pendingFollowup !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-left font-sans text-xs text-ink-muted transition duration-fast ease-out hover:border-accent hover:text-ink disabled:opacity-50"
              >
                {pendingFollowup === question && <Icon icon={Loader2} size="xs" className="animate-spin" />}
                {question}
              </button>
            ))}
          </div>
          {followupError && <p className="font-sans text-xs text-unsupported">{followupError}</p>}
        </div>
      )}

      {tab === "evidence" && <EvidenceList evidence={nodeEvidence} />}

      <AlertDialog open={confirmingDelete} onOpenChange={(o) => !o && setConfirmingDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{node.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the node and its evidence. Any other node whose own claim depended on
              this one is marked stale rather than deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
