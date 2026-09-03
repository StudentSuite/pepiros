"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, PanelLeft } from "lucide-react";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { ReaderTabsNav } from "@/components/reader/ReaderTabsNav";
import { Icon } from "@/components/ui/Icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/shadcn/sheet";

/**
 * Issue #293: the canvas route's whole header used to be a bare <h1>Graph</h1>
 * at 11px mono plus ReaderTabsNav -- no breadcrumb, no paper title, no way
 * to reach the library or the node list short of the browser back button.
 * #90 already fixed this class of drift for Audit/Outline/Learn; the canvas
 * was left as it was.
 *
 * Reuses the reader header's exact breadcrumb (Library/Discover > workspace
 * > paper). "The paper" here is whichever paper the selected node belongs to,
 * falling back to the workspace's first paper -- the same default
 * ReaderClient uses before anything is selected. The full reader Sidebar
 * (section/chunk navigation) doesn't map onto the canvas, which isn't
 * paper-scoped the way the reader is; this is a simplified paper/node list
 * in a sheet instead, reachable from every width rather than a permanent
 * rail React Flow would have to share space with.
 */
export function CanvasHeader({ workspaceId, isGuest }: { workspaceId: string; isGuest: boolean }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectNode = useWorkspaceStore((s) => s.selectNode);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedNode = workspace?.nodes.find((n) => n.id === selectedNodeId);
  const activePaper = selectedNode?.paperId
    ? (workspace?.papers.find((p) => p.id === selectedNode.paperId) ?? workspace?.papers[0])
    : workspace?.papers[0];

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-s-3 border-b border-border px-s-5 py-s-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-sans text-sm">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Open papers and nodes"
          className="-ml-1 shrink-0 rounded p-1.5 text-ink-faint transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
        >
          <Icon icon={PanelLeft} size="sm" />
        </button>
        <Link
          href={isGuest ? "/discover" : "/workspaces"}
          className="shrink-0 text-ink-faint hover:text-ink"
        >
          {isGuest ? "Discover" : "Library"}
        </Link>
        <Icon icon={ChevronRight} size="xs" className="shrink-0 text-ink-faint" />
        <span className="hidden shrink-0 text-ink-faint sm:inline">
          {workspace?.name ?? "..."}
        </span>
        <Icon icon={ChevronRight} size="xs" className="hidden shrink-0 text-ink-faint sm:inline" />
        {/* Issue #324: a flex item's min-width defaults to `auto`, not 0 --
            the parent nav's own min-w-0 doesn't cascade down to this child,
            so a long title's full un-truncated width still forced this span
            past its allotted space (confirmed live, 147-163px overflow)
            even with `truncate` already set. min-w-0 here is what actually
            lets truncate's overflow/ellipsis take effect. */}
        <span className="min-w-0 truncate font-medium text-ink">{activePaper?.title ?? "..."}</span>
      </nav>

      <ReaderTabsNav workspaceId={workspaceId} active="canvas" />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-s-4 py-s-3 text-left">
            <SheetTitle className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
              Papers &amp; nodes
            </SheetTitle>
            <SheetDescription className="sr-only">
              Jump to a paper or claim on this graph.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 overflow-y-auto p-s-4">
            <div className="flex flex-col gap-1">
              <h2 className="px-1 font-mono text-2xs uppercase tracking-widest text-ink-faint">
                Papers &middot; {workspace?.papers.length ?? 0}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {workspace?.papers.map((paper) => (
                  <li key={paper.id}>
                    <span
                      className={clsx(
                        "block w-full truncate rounded px-2 py-1.5 text-left font-sans text-sm",
                        paper.id === activePaper?.id ? "bg-surface-sunken text-ink" : "text-ink-muted",
                      )}
                      title={paper.title}
                    >
                      {paper.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="px-1 font-mono text-2xs uppercase tracking-widest text-ink-faint">
                Claims
              </h2>
              <ul className="flex flex-col gap-0.5">
                {workspace?.nodes
                  .filter((n) => n.type === "leaf")
                  .map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => {
                          selectNode(node.id);
                          setSheetOpen(false);
                        }}
                        className={clsx(
                          "w-full truncate rounded px-2 py-1 text-left font-sans text-xs transition-colors duration-fast ease-out",
                          node.id === selectedNodeId
                            ? "bg-surface-sunken text-ink"
                            : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                        )}
                        title={node.title}
                      >
                        {node.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>

            <Link
              href={`/w/${workspaceId}`}
              className="mt-s-2 rounded border border-border-strong px-s-3 py-1.5 text-center font-sans text-xs text-ink-muted transition-colors duration-fast ease-out hover:border-accent hover:text-ink"
            >
              Back to reader
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
