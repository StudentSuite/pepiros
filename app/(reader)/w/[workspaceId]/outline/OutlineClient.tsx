"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { GraphNode } from "@/types/anchor";
import { PillarChip } from "@/components/ui/PillarChip";

function TreeItem({
  node,
  childrenByParent,
  workspaceId,
}: {
  node: GraphNode;
  childrenByParent: Map<string, GraphNode[]>;
  workspaceId: string;
}) {
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  const children = childrenByParent.get(node.id) ?? [];

  return (
    <li>
      <div className="flex items-center gap-2">
        <span className="rounded border border-border px-1 py-0.5 font-mono text-[9px] uppercase text-ink-faint">
          {node.type}
        </span>
        {node.pillarIndex !== null && (
          <PillarChip pillarIndex={node.pillarIndex} label={`pillar ${node.pillarIndex}`} />
        )}
        <Link
          href={`/w/${workspaceId}`}
          onClick={() => selectNode(node.id)}
          className="font-serif text-sm text-ink hover:underline"
        >
          {node.title}
        </Link>
      </div>
      {children.length > 0 && (
        <ul className="ml-3 mt-1.5 flex flex-col gap-1.5 border-l border-border pl-4">
          {children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              childrenByParent={childrenByParent}
              workspaceId={workspaceId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * a11y-equivalent nested list view of the whole graph (also the demo-day
 * fallback if the canvas has trouble): paper -> pillar -> leaf, derived from
 * `contains` edges. Thread/synthesis nodes have no `contains` parent, so
 * they're listed separately below the per-paper trees rather than dropped.
 */
export function OutlineClient({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);

  useEffect(() => {
    loadWorkspace(workspaceId);
  }, [workspaceId, loadWorkspace]);

  if (!workspace) {
    return <p className="p-8 font-sans text-sm text-ink-faint">Loading workspace...</p>;
  }

  const childrenByParent = new Map<string, GraphNode[]>();
  for (const edge of workspace.edges) {
    if (edge.kind !== "contains") continue;
    const child = workspace.nodes.find((n) => n.id === edge.targetId);
    if (!child) continue;
    const list = childrenByParent.get(edge.sourceId) ?? [];
    list.push(child);
    childrenByParent.set(edge.sourceId, list);
  }

  const roots = workspace.nodes.filter((n) => n.type === "paper");
  const looseNodes = workspace.nodes.filter(
    (n) => (n.type === "thread" || n.type === "synthesis"),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Outline</h1>
        <Link href={`/w/${workspaceId}`} className="font-sans text-sm text-ink-muted hover:text-ink">
          Back to reader
        </Link>
      </header>

      <ul className="flex flex-col gap-5">
        {roots.map((root) => (
          <TreeItem
            key={root.id}
            node={root}
            childrenByParent={childrenByParent}
            workspaceId={workspaceId}
          />
        ))}
      </ul>

      {looseNodes.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Cross-paper nodes
          </h2>
          <ul className="flex flex-col gap-2">
            {looseNodes.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                childrenByParent={childrenByParent}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
