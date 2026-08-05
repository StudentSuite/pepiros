"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { SectionNav } from "@/components/reader/SectionNav";
import { PdfPane } from "@/components/reader/PdfPane";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import type { Highlight } from "@/components/reader/HighlightLayer";

/**
 * Read-only variant of the reader view for a share link. There's no real
 * share_tokens table/RLS policy wired up yet (lib/services doesn't resolve
 * shareToken -> workspaceId), so this always loads the fixture's only
 * workspace ("ws-1") regardless of the token -- a real implementation would
 * look up the token first and 404/expire appropriately. No ChatDock, no
 * NodeEditor access (NodeInspector is mounted with readOnly).
 */
export function ShareClient({ shareToken }: { shareToken: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  useEffect(() => {
    loadWorkspace("ws-1");
  }, [loadWorkspace]);

  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);

  const firstPaper = workspace?.papers[0];
  const paperChunks = useMemo(
    () => (workspace && firstPaper ? workspace.chunks.filter((c) => c.paperId === firstPaper.id) : []),
    [workspace, firstPaper],
  );

  useEffect(() => {
    if (paperChunks.length > 0 && !activeChunkId) {
      setActiveChunkId(paperChunks[0]!.id);
    }
  }, [paperChunks, activeChunkId]);

  useEffect(() => {
    if (!workspace || !selectedNodeId) return;
    const anchored = workspace.evidence.find((e) => e.nodeId === selectedNodeId && e.anchor);
    if (anchored?.anchor) setActiveChunkId(anchored.anchor.chunkId);
  }, [workspace, selectedNodeId]);

  if (!workspace || !firstPaper) {
    return <p className="p-8 font-sans text-sm text-ink-faint">Loading shared workspace...</p>;
  }

  const activeChunk = workspace.chunks.find((c) => c.id === activeChunkId) ?? paperChunks[0];
  const highlights: Highlight[] = activeChunk
    ? workspace.evidence
        .filter((e) => e.anchor && e.anchor.chunkId === activeChunk.id)
        .map((e) => ({ id: e.id, spans: e.anchor!.spans, tier: e.tier }))
    : [];

  const leafNodes = workspace.nodes.filter((n) => n.type === "leaf" && n.paperId === firstPaper.id);

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-surface-sunken px-6 py-2 text-center font-sans text-xs text-ink-faint">
        Shared read-only view (token {shareToken}) -- no editing, no chat.
      </div>

      <header className="border-b border-border px-6 py-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          {workspace.name}
        </p>
        <h1 className="font-serif text-xl text-ink">{firstPaper.title}</h1>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[200px_1fr]">
        <aside className="flex flex-col gap-4">
          <SectionNav
            chunks={paperChunks}
            activeSectionId={activeChunk?.sectionId ?? null}
            onSelect={(sectionId) => {
              const chunk = paperChunks.find((c) => c.sectionId === sectionId);
              if (chunk) setActiveChunkId(chunk.id);
            }}
          />
          <ul className="flex flex-col gap-0.5">
            {leafNodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => selectNode(node.id)}
                  className={clsx(
                    "w-full rounded px-2 py-1 text-left font-sans text-xs",
                    node.id === selectedNodeId
                      ? "bg-surface-raised text-ink"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {node.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex flex-col gap-4">
          {activeChunk && <PdfPane chunk={activeChunk} highlights={highlights} />}
          <div className="rounded border border-border bg-surface-raised p-4">
            <NodeInspector readOnly />
          </div>
        </main>
      </div>
    </div>
  );
}
