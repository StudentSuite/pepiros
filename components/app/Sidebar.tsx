"use client";

import clsx from "clsx";
import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { PillarChip } from "@/components/ui/PillarChip";
import { ReadingPath } from "@/components/path/ReadingPath";
import { SectionNav } from "@/components/reader/SectionNav";
import type { Paper, GraphNode, Chunk } from "@/types/anchor";

/**
 * Left library/outline rail -- replaces the old two-line header + pill-tab
 * paper switcher + bare node list with the structure real research tools
 * use (library, pillars-as-collections, search), built only from data this
 * workspace actually has. No fabricated Collections/Tags/counts: pillars
 * already ARE a real thematic grouping (docs/PLAN-V1.md §7), so that's
 * what "collections" maps to here, not an invented feature.
 */
export function Sidebar({
  papers,
  activePaperId,
  onSelectPaper,
  pillars,
  leafNodes,
  selectedNodeId,
  onSelectNode,
  query,
  onQueryChange,
  paperChunks,
  activeSectionId,
  onSelectSection,
}: {
  papers: Paper[];
  activePaperId: string | undefined;
  onSelectPaper: (paperId: string) => void;
  pillars: GraphNode[];
  leafNodes: GraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  paperChunks: Chunk[];
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const filteredPapers = q ? papers.filter((p) => p.title.toLowerCase().includes(q)) : papers;
  const filteredNodes = q ? leafNodes.filter((n) => n.title.toLowerCase().includes(q)) : leafNodes;

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-[var(--glass-edge)] bg-[var(--glass-bg)] px-4 py-5 backdrop-blur-[var(--glass-blur)] backdrop-saturate-150">
      {/* Issue #97: the one shell whose wordmark didn't go anywhere --
          SiteHeader and AppSidebar both wrap theirs in a home link. */}
      <Link href="/" aria-label="Pepiros home">
        <Logo />
      </Link>

      <div className="relative">
        <Icon icon={Search} size="xs" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search papers, nodes..."
          className="pl-8 text-xs"
        />
      </div>

      <section className="flex flex-col gap-1">
        <h2 className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Library &middot; {papers.length}
        </h2>
        <ul className="flex flex-col gap-0.5">
          {filteredPapers.map((paper) => (
            <li key={paper.id}>
              <button
                type="button"
                onClick={() => onSelectPaper(paper.id)}
                className={clsx(
                  "w-full truncate rounded px-2 py-1.5 text-left font-serif text-sm transition duration-fast ease-out",
                  paper.id === activePaperId
                    ? "bg-surface-sunken text-ink"
                    : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                )}
                title={paper.title}
              >
                {paper.title}
              </button>
            </li>
          ))}
          {filteredPapers.length === 0 && (
            <li className="px-2 py-1 font-sans text-xs text-ink-faint">No papers match &ldquo;{query}&rdquo;.</li>
          )}
        </ul>
      </section>

      {pillars.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">Pillars</h2>
          <div className="flex flex-wrap gap-1.5 px-1">
            {pillars.map((pillar) => (
              <PillarChip key={pillar.id} pillarIndex={pillar.pillarIndex} label={pillar.title} />
            ))}
          </div>
        </section>
      )}

      <section className="px-1">
        <SectionNav chunks={paperChunks} activeSectionId={activeSectionId} onSelect={onSelectSection} />
      </section>

      <section className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <h2 className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Nodes &middot; {leafNodes.length}
        </h2>
        <ul className="flex flex-col gap-0.5">
          {filteredNodes.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={clsx(
                  "w-full truncate rounded px-2 py-1 text-left font-sans text-xs transition duration-fast ease-out",
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
          {filteredNodes.length === 0 && (
            <li className="px-2 py-1 font-sans text-xs text-ink-faint">No nodes match &ldquo;{query}&rdquo;.</li>
          )}
        </ul>
      </section>

      <ReadingPath />
    </aside>
  );
}
