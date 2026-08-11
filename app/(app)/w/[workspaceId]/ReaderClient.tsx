"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { SectionNav } from "@/components/reader/SectionNav";
import { PdfPane } from "@/components/reader/PdfPane";
import { CoverageOverlay } from "@/components/reader/CoverageOverlay";
import { RelatedPapersRail } from "@/components/related/RelatedPapersRail";
import { ChatDock } from "@/components/chat/ChatDock";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { ReadingPath } from "@/components/path/ReadingPath";
import { NumericChart } from "@/components/viz/NumericChart";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import type { Highlight } from "@/components/reader/HighlightLayer";

/**
 * The default doc-reader landing surface (plan.md §1): summary/title top,
 * paper tabs, section nav + node list left, PDF pane + inspector centre,
 * related-papers rail right, chat docked at the bottom. Canvas is reached
 * only via the explicit "Explore graph" link -- this view never renders it.
 */
export function ReaderClient({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  useEffect(() => {
    loadWorkspace(workspaceId);
  }, [workspaceId, loadWorkspace]);

  const [activePaperId, setActivePaperId] = useState<string | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);

  const paperChunks = useMemo(
    () =>
      workspace && activePaperId
        ? workspace.chunks.filter((c) => c.paperId === activePaperId)
        : [],
    [workspace, activePaperId],
  );

  // Default to the first paper/chunk once the workspace loads.
  useEffect(() => {
    if (workspace && !activePaperId) {
      const first = workspace.papers[0];
      if (first) {
        setActivePaperId(first.id);
        const firstChunk = workspace.chunks.find((c) => c.paperId === first.id);
        if (firstChunk) setActiveChunkId(firstChunk.id);
      }
    }
  }, [workspace, activePaperId]);

  // Follow node selection: jump the PDF pane to whatever chunk backs the
  // selected node's evidence, so "open a node, read it beside the
  // highlighted source PDF" (plan.md §1) actually holds here.
  useEffect(() => {
    if (!workspace || !selectedNodeId) return;
    const anchored = workspace.evidence.find((e) => e.nodeId === selectedNodeId && e.anchor);
    if (anchored?.anchor) {
      const chunk = workspace.chunks.find((c) => c.id === anchored.anchor!.chunkId);
      if (chunk) {
        setActivePaperId(chunk.paperId);
        setActiveChunkId(chunk.id);
      }
    }
  }, [workspace, selectedNodeId]);

  if (!workspace) {
    // Skeleton shaped like the real layout below, not a bare spinner (§14.5).
    return (
      <div className="min-h-screen px-6 py-6" role="status" aria-label="Loading workspace">
        <Skeleton className="h-8 w-64" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr_280px]">
          <Skeleton className="h-40" />
          <div className="flex flex-col gap-4">
            <Skeleton className="aspect-[612/792] w-full max-w-xl" />
            <SkeletonText lines={4} />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const activePaper = workspace.papers.find((p) => p.id === activePaperId) ?? workspace.papers[0];
  const activeChunk = workspace.chunks.find((c) => c.id === activeChunkId) ?? paperChunks[0];
  const activeSectionId = activeChunk?.sectionId ?? null;

  const highlights: Highlight[] = activeChunk
    ? workspace.evidence
        .filter((e) => e.anchor && e.anchor.chunkId === activeChunk.id)
        .map((e) => ({ id: e.id, spans: e.anchor!.spans, tier: e.tier }))
    : [];

  const leafNodes = workspace.nodes.filter(
    (n) => n.type === "leaf" && n.paperId === activePaper?.id,
  );

  return (
    <div className="min-h-screen pb-32">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            {workspace.name}
          </p>
          <h1 className="font-serif text-xl text-ink">
            {activePaper ? activePaper.title : workspace.name}
          </h1>
        </div>
        <nav className="flex items-center gap-4 font-sans text-sm">
          <Link href={`/w/${workspaceId}/outline`} className="text-ink-muted hover:text-ink">
            Outline
          </Link>
          <Link href={`/w/${workspaceId}/audit`} className="text-ink-muted hover:text-ink">
            Audit
          </Link>
          <Link href={`/w/${workspaceId}/learn`} className="text-ink-muted hover:text-ink">
            Learn
          </Link>
          <Link
            href={`/w/${workspaceId}/canvas`}
            className="rounded border border-border-strong px-3 py-1.5 text-ink-muted hover:text-ink"
          >
            Explore graph
          </Link>
        </nav>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border px-6 py-2">
        {workspace.papers.map((paper) => (
          <button
            key={paper.id}
            type="button"
            onClick={() => {
              setActivePaperId(paper.id);
              const firstChunk = workspace.chunks.find((c) => c.paperId === paper.id);
              setActiveChunkId(firstChunk?.id ?? null);
            }}
            className={clsx(
              "rounded px-2.5 py-1 font-sans text-xs",
              paper.id === activePaper?.id
                ? "bg-surface-raised text-ink"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {paper.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[200px_1fr_280px]">
        <aside className="flex flex-col gap-4">
          <SectionNav
            chunks={paperChunks}
            activeSectionId={activeSectionId}
            onSelect={(sectionId) => {
              const chunk = paperChunks.find((c) => c.sectionId === sectionId);
              if (chunk) setActiveChunkId(chunk.id);
            }}
          />
          <div>
            <h3 className="mb-1 font-sans text-[11px] uppercase tracking-wide text-ink-faint">
              Nodes
            </h3>
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
          </div>
          <ReadingPath />
        </aside>

        <main className="flex flex-col gap-4">
          {activeChunk ? (
            <PdfPane chunk={activeChunk} highlights={highlights} />
          ) : (
            // Page-shaped skeleton, not a blank gap, for the moment before a
            // paper/chunk is selected (docs/PLAN-V1.md §14.5).
            <div className="mx-auto w-full max-w-xl" role="status" aria-label="Loading page">
              <Skeleton className="aspect-[612/792] w-full rounded" />
            </div>
          )}
          <CoverageOverlay chunks={paperChunks} evidence={workspace.evidence} />
          <div className="rounded border border-border bg-surface-raised p-4">
            <NodeInspector />
          </div>
        </main>

        <aside className="flex flex-col gap-4">
          <RelatedPapersRail workspaceId={workspaceId} paperId={activePaper?.id} />
          <NumericChart />
        </aside>
      </div>

      <ChatDock />
    </div>
  );
}
