"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { Sidebar } from "@/components/app/Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/shadcn/sidebar";
import { ReaderTabsNav } from "@/components/reader/ReaderTabsNav";
import { PdfPane } from "@/components/reader/PdfPane";
import { AnchorStepper } from "@/components/reader/AnchorStepper";
import { CoverageGutter } from "@/components/reader/CoverageGutter";
import { ClaimsList } from "@/components/reader/ClaimsList";
import { GraphPreviewCard } from "@/components/reader/GraphPreviewCard";
import { RelatedPapersRail } from "@/components/related/RelatedPapersRail";
import { ChatDock } from "@/components/chat/ChatDock";
import { SelectionAudit } from "@/components/reader/SelectionAudit";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { NumericChart } from "@/components/viz/NumericChart";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import type { Highlight } from "@/components/reader/HighlightLayer";

/**
 * The default doc-reader landing surface (docs/PLAN-V1.md §1). Rebuilt
 * 2026-08-11 on top of a real Library/Pillars sidebar (design/DIRECTIONS.md)
 * -- a breadcrumb top bar, paper-white reading pane, and a citation-graph
 * preview + real edge-kind legend replace the old two-line header, pill-tab
 * switcher, and bare node list. Canvas is reached only via "Explore graph" --
 * this view never renders the full React Flow canvas itself.
 */
export function ReaderClient({ workspaceId, isGuest = false }: { workspaceId: string; isGuest?: boolean }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const loadError = useWorkspaceStore((s) => s.loadError);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  useEffect(() => {
    loadWorkspace(workspaceId);
  }, [workspaceId, loadWorkspace]);

  const [activePaperId, setActivePaperId] = useState<string | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Issue #242: GraphPreviewCard/RelatedPapersRail/NumericChart used to sit
  // in a permanent 18rem column beside the source pane; that width is now
  // the claims stack's, so those move behind this small in-pane toggle.
  const [railTab, setRailTab] = useState<"claims" | "more">("claims");
  // Issue #250: below lg, the source and claims panes stack in one long
  // column (PdfPane + gutter, then the whole claims stack) instead of the
  // reader's inherently single-column mobile view showing one thing at a
  // time. This mirrors #242's split with a Source/Claims segmented control
  // instead of a two-pane grid, matching the reader's own established
  // pattern (rail already uses this exact segmented-control shape).
  const [mobilePane, setMobilePane] = useState<"source" | "claims">("source");

  // Issue #294: a floating "Claims citing this / Ask" action on a source-pane
  // text selection. sourcePaneRef scopes selection detection to the pane
  // itself (a selection made in the claims list or chrome shouldn't trigger
  // it); pendingChatQuestion is how "Ask" hands a pre-filled question to
  // ChatDock, which owns its own open/draft state otherwise.
  const sourcePaneRef = useRef<HTMLDivElement>(null);
  const [pendingChatQuestion, setPendingChatQuestion] = useState<string | null>(null);

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

  if (loadError) {
    // Issue #254: GET /api/workspace/[workspaceId] 404s for a mistyped
    // link, a stale bookmark, or a deleted workspace -- this used to hold
    // the loading state forever instead of surfacing that, matching what
    // /s/[shareToken] already does for an invalid share token.
    return (
      <main id="main-content" className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center p-s-5 text-center">
        <Link href="/" aria-label="Pepiros home" className="mb-s-6">
          <Logo />
        </Link>
        <h1 className="font-sans font-bold text-xl text-ink">This workspace doesn&apos;t exist</h1>
        <p className="mt-s-3 font-sans text-sm text-ink-muted">
          The link you followed doesn&apos;t resolve to a workspace. It may have been mistyped, or the workspace may no longer exist.
        </p>
        <div className="mt-s-5 flex flex-wrap items-center justify-center gap-s-3">
          <Link href="/discover" className={buttonClassName("secondary", "md")}>
            Discover papers
          </Link>
          <Link href="/workspaces" className={buttonClassName("secondary", "md")}>
            Your workspaces
          </Link>
        </div>
      </main>
    );
  }

  if (!workspace) {
    // Skeleton shaped like the real layout below, not a bare spinner (§14.5).
    return (
      <div className="flex min-h-screen" role="status" aria-label="Loading workspace">
        <Skeleton className="h-screen w-60 shrink-0" />
        <div className="flex-1 p-s-5">
          <Skeleton className="h-6 w-80" />
          <div className="mt-s-5 grid gap-s-5 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-s-4">
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
  const activePdfUrl = activePaper?.pdfStoragePath
    ? `/api/papers/${activePaper.id}/pdf?workspaceId=${encodeURIComponent(workspaceId)}`
    : null;

  const highlights: Highlight[] = activeChunk
    ? workspace.evidence
        .filter((e) => e.anchor && e.anchor.chunkId === activeChunk.id)
        .map((e) => ({ id: e.id, spans: e.anchor!.spans, tier: e.tier, nodeId: e.nodeId }))
    : [];

  const pillars = workspace.nodes.filter((n) => n.type === "pillar" && n.paperId === activePaper?.id);
  const leafNodes = workspace.nodes.filter(
    (n) => n.type === "leaf" && n.paperId === activePaper?.id,
  );

  return (
    <SidebarProvider>
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

      <div className="flex min-w-0 min-h-screen flex-1 flex-col pb-32">
        {/* Reader chrome. Soft glass, so it reads as tooling sitting over the
            page rather than as part of the document, and sticky so the paper
            title stays available while reading. */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-s-3 border-b border-[var(--glass-edge)] bg-[var(--glass-bg)] px-s-5 py-s-3 backdrop-blur-[var(--glass-blur)] backdrop-saturate-150">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 font-sans text-[13px]"
          >
            <SidebarTrigger className="-ml-1 shrink-0" />
            {/* Issue #98: /workspaces is auth-protected (middleware.ts), but
                /w itself is deliberately guest-open -- a guest clicking this,
                the leftmost and most prominent breadcrumb chrome, used to
                silently bounce to /login?next=/workspaces. Points at
                /discover instead for a guest session, which is real,
                guest-accessible, and still a meaningful "go up a level." */}
            <Link
              href={isGuest ? "/discover" : "/workspaces"}
              className="shrink-0 text-ink-faint hover:text-ink"
            >
              {isGuest ? "Discover" : "Library"}
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
            {/* Issue #324: a flex item's min-width defaults to `auto` (its
                content's intrinsic width), not 0 -- the parent nav's own
                min-w-0 doesn't cascade down to this child, so a long title's
                full un-truncated width still forced this span past its
                allotted space (confirmed live, 147-163px overflow) even
                though `truncate` was already set. min-w-0 here is what
                actually lets truncate's overflow/ellipsis take effect. */}
            <span className="min-w-0 truncate font-medium text-ink">
              {activePaper?.title ?? "..."}
            </span>
          </nav>

          {/* Issue #143: Share/Export now live inside ReaderTabsNav itself,
              so every reader route gets them, not just this one. */}
          <ReaderTabsNav workspaceId={workspaceId} active="reader" />
        </header>

        {/* Issue #250: below lg the two-pane grid stacks into one long
            column (source pane, then the whole claims stack) instead of
            showing one at a time. This segmented control toggles which
            pane is visible below lg; at lg and up both always show, side
            by side, and the control itself disappears. */}
        <div
          role="tablist"
          aria-label="Reader pane"
          className="mx-auto mt-s-5 flex w-full max-w-[92rem] gap-1 rounded-full border border-border bg-surface-sunken p-0.5 px-s-5 lg:hidden"
        >
          {(["source", "claims"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              role="tab"
              aria-selected={mobilePane === pane}
              onClick={() => setMobilePane(pane)}
              className={clsx(
                "flex-1 rounded-full px-3 py-1.5 font-sans text-sm transition-colors duration-fast ease-out",
                mobilePane === pane
                  ? "bg-surface-raised font-medium text-ink shadow-e-1"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              {pane === "source" ? "Source" : "Claims"}
            </button>
          ))}
        </div>

        {/* Issue #242: split-column reader. Source pane left (continuous
            reading measure), claims pane right (a scannable stack, not a
            280px rail of secondary widgets) -- the homepage's own mechanism
            copy already states this as the product's position: "the claim
            and its source, side by side". */}
        <div className="mx-auto grid w-full max-w-[92rem] gap-s-6 p-s-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <main
            id="main-content"
            ref={sourcePaneRef}
            className={clsx(
              "min-w-0 flex-col gap-s-3",
              mobilePane === "claims" ? "hidden lg:flex" : "flex",
            )}
          >
            <AnchorStepper
              highlights={highlights}
              activeNodeId={selectedNodeId}
              onSelect={selectNode}
            />
            <div className="flex min-w-0 gap-s-3">
              <div className="min-w-0 flex-1">
                {activeChunk ? (
                  <PdfPane
                    chunk={activeChunk}
                    pdfUrl={activePdfUrl}
                    highlights={highlights}
                    activeNodeId={selectedNodeId}
                    onSelectHighlight={selectNode}
                  />
                ) : (
                  // Page-shaped skeleton, not a blank gap, for the moment before a
                  // paper/chunk is selected (docs/PLAN-V1.md §14.5).
                  <div className="mx-auto w-full max-w-xl" role="status" aria-label="Loading page">
                    <Skeleton className="aspect-[612/792] w-full rounded" />
                  </div>
                )}
              </div>
              {/* Issue #245: coverage as a thumbnail gutter down the source
                  pane's edge, replacing the footer strip that used to clip
                  behind the chat dock on narrow viewports. */}
              <CoverageGutter
                chunks={paperChunks}
                evidence={workspace.evidence}
                activePage={activeChunk?.page ?? null}
                onSelectPage={(page) => {
                  const chunk = paperChunks.find((c) => c.page === page);
                  if (chunk) setActiveChunkId(chunk.id);
                }}
              />
            </div>
          </main>

          <SelectionAudit
            workspaceId={workspaceId}
            containerRef={sourcePaneRef}
            leafNodes={leafNodes}
            evidence={workspace.evidence}
            onFoundClaim={(nodeId) => {
              selectNode(nodeId);
              setMobilePane("claims");
              setRailTab("claims");
              // Wait a frame for the claims pane to actually be visible
              // (mobile pane toggle, rail tab switch) before scrolling.
              requestAnimationFrame(() => {
                document.getElementById(`claim-${nodeId}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              });
            }}
            onAsk={setPendingChatQuestion}
          />

          <aside
            className={clsx(
              "min-w-0 flex-col gap-s-4",
              mobilePane === "source" ? "hidden lg:flex" : "flex",
            )}
          >
            <div
              role="tablist"
              aria-label="Reader side panel"
              className="flex gap-1 rounded-full border border-border bg-surface-sunken p-0.5"
            >
              {(["claims", "more"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={railTab === tab}
                  onClick={() => setRailTab(tab)}
                  className={clsx(
                    "flex-1 rounded-full px-2 py-1 font-sans text-xs transition-colors duration-fast ease-out",
                    railTab === tab
                      ? "bg-surface-raised text-ink shadow-e-1"
                      : "text-ink-faint hover:text-ink",
                  )}
                >
                  {tab === "claims" ? "Claims" : "More"}
                </button>
              ))}
            </div>

            {railTab === "claims" ? (
              <ClaimsList
                leafNodes={leafNodes}
                evidence={workspace.evidence}
                chunks={paperChunks}
                selectedNodeId={selectedNodeId}
                onSelectNode={selectNode}
              />
            ) : (
              <>
                <GraphPreviewCard workspaceId={workspaceId} nodeCount={workspace.nodes.length} />
                <RelatedPapersRail workspaceId={workspaceId} paperId={activePaper?.id} />
                <NumericChart />
              </>
            )}

            <Panel padded>
              <NodeInspector />
            </Panel>
          </aside>
        </div>
      </div>

      <ChatDock
        activePaperId={activePaper?.id}
        pendingQuestion={pendingChatQuestion}
        onPendingQuestionHandled={() => setPendingChatQuestion(null)}
      />
    </SidebarProvider>
  );
}
