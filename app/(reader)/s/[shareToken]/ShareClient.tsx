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
export function ShareClient({ shareToken, workspaceId }: { shareToken: string; workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectNode = useWorkspaceStore((s) => s.selectNode);

  useEffect(() => {
    loadWorkspace(workspaceId);
  }, [workspaceId, loadWorkspace]);

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
    return (
      <div className="min-h-screen">
        <SiteNav />
        <p className="p-8 font-sans text-sm text-ink-faint">Loading shared workspace...</p>
      </div>
    );
  }

  const activeChunk = workspace.chunks.find((c) => c.id === activeChunkId) ?? paperChunks[0];
  const activePdfUrl = firstPaper.pdfStoragePath
    ? `/api/papers/${firstPaper.id}/pdf?workspaceId=${encodeURIComponent(workspaceId)}`
    : null;
  const highlights: Highlight[] = activeChunk
    ? workspace.evidence
        .filter((e) => e.anchor && e.anchor.chunkId === activeChunk.id)
        .map((e) => ({ id: e.id, spans: e.anchor!.spans, tier: e.tier }))
    : [];

  const leafNodes = workspace.nodes.filter((n) => n.type === "leaf" && n.paperId === firstPaper.id);

  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="border-b border-border bg-surface-sunken px-s-5 py-s-3 text-center font-sans text-xs text-ink-faint">
        Shared read-only view (token {shareToken}) -- no editing, no chat.
      </div>

      <header className="border-b border-border px-s-5 py-s-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {workspace.name}
        </p>
        <h1 className="font-serif text-xl text-ink">{firstPaper.title}</h1>
      </header>

      <div className="grid gap-s-5 p-s-5 lg:grid-cols-[200px_1fr]">
        <aside className="flex flex-col gap-s-4">
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

        <main id="main-content" className="flex flex-col gap-s-4">
          {activeChunk && <PdfPane chunk={activeChunk} pdfUrl={activePdfUrl} highlights={highlights} />}
          <div className="rounded border border-border bg-surface-raised p-s-4">
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
