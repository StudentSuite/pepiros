"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { SectionNav } from "@/components/reader/SectionNav";
import { PdfPane } from "@/components/reader/PdfPane";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import type { Highlight } from "@/components/reader/HighlightLayer";

/**
 * Read-only variant of the reader view for a share link. The token is
 * resolved server-side in page.tsx against lib/services/share.ts before this
 * ever mounts (an unknown token renders an "invalid or expired" state
 * instead), so this loads whichever workspace the token actually maps to,
 * not a hardcoded fixture id. No ChatDock, no NodeEditor access
 * (NodeInspector is mounted with readOnly).
 */
export function ShareClient({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  useEffect(() => {
    loadWorkspace(workspaceId);
  }, [workspaceId, loadWorkspace]);

  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  // Issue #145: used to hardcode to workspace.papers[0] with no way to
  // reach the rest -- a stranger opening a share link to a multi-paper
  // workspace had no way to know other papers existed, let alone select
  // one. Defaults to the first paper, same starting point as before.
  const [activePaperId, setActivePaperId] = useState<string | null>(null);

  useEffect(() => {
    if (workspace && !activePaperId && workspace.papers.length > 0) {
      setActivePaperId(workspace.papers[0]!.id);
    }
  }, [workspace, activePaperId]);

  const activePaper = workspace?.papers.find((p) => p.id === activePaperId);
  const paperChunks = useMemo(
    () => (workspace && activePaper ? workspace.chunks.filter((c) => c.paperId === activePaper.id) : []),
    [workspace, activePaper],
  );

  useEffect(() => {
    // Issue #157: previously only handled the paperChunks.length > 0 case,
    // leaving activeChunkId pointing at the *previous* paper's chunk when
    // the newly-selected paper has none of its own yet (e.g. still
    // processing). Explicitly null it out instead of leaving it stale.
    setActiveChunkId(paperChunks.length > 0 ? paperChunks[0]!.id : null);
    // Issue #219: selectedNodeId was never reset here, so a node selected
    // while viewing paper A stayed selected (and rendered in the inspector,
    // by id, across the whole workspace) after switching to paper B --
    // showing evidence/anchors from a paper no longer shown in the PDF pane
    // next to it.
    selectNode(null);
    // Resets to this paper's own first chunk whenever the selected paper
    // changes, rather than only filling in an empty activeChunkId once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePaperId]);

  useEffect(() => {
    if (!workspace || !selectedNodeId) return;
    const anchored = workspace.evidence.find((e) => e.nodeId === selectedNodeId && e.anchor);
    if (anchored?.anchor) setActiveChunkId(anchored.anchor.chunkId);
  }, [workspace, selectedNodeId]);

  if (!workspace || !activePaper) {
    return (
      <div className="min-h-dvh">
        <SiteNav />
        <p className="p-8 font-sans text-sm text-ink-faint">Loading shared workspace...</p>
      </div>
    );
  }

  // Issue #157: scoped to this paper's own chunks, not the whole
  // workspace's -- otherwise a stale activeChunkId from the previously
  // selected paper could resolve to a real chunk that just belongs to a
  // different paper than the one currently shown.
  const activeChunk = paperChunks.find((c) => c.id === activeChunkId) ?? paperChunks[0];
  const activePdfUrl = activePaper.pdfStoragePath
    ? `/api/papers/${activePaper.id}/pdf?workspaceId=${encodeURIComponent(workspaceId)}`
    : null;
  const highlights: Highlight[] = activeChunk
    ? workspace.evidence
        .filter((e) => e.anchor && e.anchor.chunkId === activeChunk.id)
        .map((e) => ({ id: e.id, spans: e.anchor!.spans, tier: e.tier, nodeId: e.nodeId }))
    : [];

  const leafNodes = workspace.nodes.filter((n) => n.type === "leaf" && n.paperId === activePaper.id);

  return (
    <div className="min-h-dvh">
      <SiteNav />

      <div className="border-b border-border bg-surface-sunken px-s-5 py-s-3 text-center font-sans text-xs text-ink-faint">
        {/* Issue #146: used to print the raw opaque token into visitor-
            facing copy -- a stranger's very first banner showed a
            meaningless hash string, reading as leaked debug output. It's
            already in the URL if they ever need to hand the link off. */}
        Shared read-only view -- no editing, no chat.
      </div>

      <header className="border-b border-border px-s-5 py-s-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {workspace.name}
        </p>
        <h1 className="font-sans font-bold text-xl text-ink">{activePaper.title}</h1>
      </header>

      <div className="grid gap-s-5 p-s-5 lg:grid-cols-[200px_1fr]">
        <aside className="flex flex-col gap-s-4">
          {workspace.papers.length > 1 && (
            <div className="flex flex-col gap-1">
              <h2 className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Papers &middot; {workspace.papers.length}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {workspace.papers.map((paper) => (
                  <li key={paper.id}>
                    <button
                      type="button"
                      onClick={() => setActivePaperId(paper.id)}
                      className={clsx(
                        "w-full truncate rounded-lg px-2 py-1.5 text-left font-sans text-sm transition duration-fast ease-out",
                        paper.id === activePaper.id
                          ? "bg-surface-sunken text-ink"
                          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                      )}
                      title={paper.title}
                    >
                      {paper.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                    "w-full rounded-lg px-2 py-1 text-left font-sans text-xs",
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

        <main id="main-content" className="flex flex-col gap-s-4">
          {activeChunk ? (
            <PdfPane chunk={activeChunk} pdfUrl={activePdfUrl} highlights={highlights} />
          ) : (
            <p className="font-sans text-sm text-ink-faint">This paper has no content to show yet.</p>
          )}
          <div className="rounded-lg border border-border bg-surface-raised p-s-4">
            <NodeInspector readOnly />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Issue #89: this page has no header/footer/Logo/Link anywhere else in the
 * file, unlike every other standalone reader subpage (/audit, /outline,
 * /learn, /canvas), which at minimum link back to the reader. A share link
 * is often the very first thing a stranger with zero context on the
 * product sees -- without this, their only way off the page was the
 * browser back button, which doesn't even work when they arrived from an
 * external link or email client.
 */
function SiteNav() {
  return (
    <nav className="flex items-center justify-between border-b border-border px-s-5 py-s-3">
      <Link href="/" aria-label="Pepiros home">
        <Logo />
      </Link>
      <div className="flex items-center gap-s-4">
        <Link href="/how-it-works" className="font-sans text-sm text-ink-muted hover:text-ink">
          What is this?
        </Link>
        <Link href="/signup" className={buttonClassName("secondary", "sm")}>
          Sign up
        </Link>
      </div>
    </nav>
  );
}
