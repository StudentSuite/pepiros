"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { Sidebar } from "@/components/app/Sidebar";
import { PdfPane } from "@/components/reader/PdfPane";
import { CoverageOverlay } from "@/components/reader/CoverageOverlay";
import { GraphPreviewCard } from "@/components/reader/GraphPreviewCard";
import { RelatedPapersRail } from "@/components/related/RelatedPapersRail";
import { ChatDock } from "@/components/chat/ChatDock";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { NumericChart } from "@/components/viz/NumericChart";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import type { Highlight } from "@/components/reader/HighlightLayer";

/**
 * The default doc-reader landing surface (docs/PLAN-V1.md §1). Rebuilt
 * 2026-08-11 on top of a real Library/Pillars sidebar (design/DIRECTIONS.md)
 * -- a breadcrumb top bar, paper-white reading pane, and a citation-graph
 * preview + real edge-kind legend replace the old two-line header, pill-tab
 * switcher, and bare node list. Canvas is reached only via "Explore graph" --
 * this view never renders the full React Flow canvas itself.
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
  const [query, setQuery] = useState("");

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
      <div className="flex min-h-screen" role="status" aria-label="Loading workspace">
        <Skeleton className="h-screen w-60 shrink-0" />
        <div className="flex-1 px-6 py-6">
          <Skeleton className="h-6 w-80" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-4">
              <Skeleton className="aspect-[612/792] w-full max-w-xl" />
              <SkeletonText lines={4} />
            </div>
            <Skeleton className="h-64" />
          </div>
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

  const pillars = workspace.nodes.filter((n) => n.type === "pillar" && n.paperId === activePaper?.id);
  const leafNodes = workspace.nodes.filter(
    (n) => n.type === "leaf" && n.paperId === activePaper?.id,
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar
        papers={workspace.papers}
        activePaperId={activePaper?.id}
        onSelectPaper={(paperId) => {
          setActivePaperId(paperId);
          const firstChunk = workspace.chunks.find((c) => c.paperId === paperId);
          setActiveChunkId(firstChunk?.id ?? null);
        }}
        pillars={pillars}
        leafNodes={leafNodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={selectNode}
        query={query}
        onQueryChange={setQuery}
        paperChunks={paperChunks}
        activeSectionId={activeSectionId}
        onSelectSection={(sectionId) => {
          const chunk = paperChunks.find((c) => c.sectionId === sectionId);
          if (chunk) setActiveChunkId(chunk.id);
        }}
      />

      <div className="flex flex-1 flex-col pb-32">
        {/* Reader chrome. Soft glass, so it reads as tooling sitting over the
            page rather than as part of the document, and sticky so the paper
            title stays available while reading. */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-s-3 border-b border-[var(--glass-edge)] bg-[var(--glass-bg)] px-s-5 py-s-3 backdrop-blur-[var(--glass-blur)] backdrop-saturate-150">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 font-sans text-[13px]"
          >
            <Link href="/workspaces" className="shrink-0 text-ink-faint hover:text-ink">
              Library
            </Link>
            <Icon icon={ChevronRight} size="xs" className="shrink-0 text-ink-faint" />
            <span className="hidden shrink-0 text-ink-faint sm:inline">
              {workspace.name}
            </span>
            <Icon
              icon={ChevronRight}
              size="xs"
              className="hidden shrink-0 text-ink-faint sm:inline"
            />
            <span className="truncate font-medium text-ink">
              {activePaper?.title ?? "..."}
            </span>
          </nav>

          <nav className="flex shrink-0 items-center gap-s-4 font-sans text-[13px] text-ink-faint">
            {[
              ["outline", "Outline"],
              ["audit", "Audit"],
              ["learn", "Learn"],
            ].map(([slug, label]) => (
              <Link
                key={slug}
                href={`/w/${workspaceId}/${slug}`}
                className="transition-colors duration-fast ease-out hover:text-ink"
              >
                {label}
              </Link>
            ))}
            <Link
              href={`/w/${workspaceId}/canvas`}
              className="rounded-full border border-border px-s-3 py-1 transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink"
            >
              Explore graph
            </Link>
          </nav>
        </header>

        {/* Reading first: the paper column gets the room, and the rail is
            secondary. The previous 1fr/280px split at a full-bleed width put
            the page image and the node body on an uncomfortably wide measure. */}
        <div className="mx-auto grid w-full max-w-6xl gap-s-6 px-s-5 py-s-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <main className="flex min-w-0 flex-col gap-s-5">
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
            <Panel padded>
              <NodeInspector />
            </Panel>
          </main>

          <aside className="flex min-w-0 flex-col gap-s-4">
            <GraphPreviewCard workspaceId={workspaceId} nodeCount={workspace.nodes.length} />
            <RelatedPapersRail workspaceId={workspaceId} paperId={activePaper?.id} />
            <NumericChart />
          </aside>
        </div>
      </div>

      <ChatDock />
    </div>
  );
}
