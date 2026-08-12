"use client";

import clsx from "clsx";
import type { Chunk } from "@/types/anchor";

/** "p2-key-finding" -> "Key Finding" -- the fixture has no separate sections
 *  table, only this sparse `chunk.sectionId` string, so we derive a label by
 *  dropping the paper-id prefix and title-casing what's left. */
function labelForSection(sectionId: string): string {
  const withoutPaperPrefix = sectionId.replace(/^p\d+-/, "");
  return withoutPaperPrefix
    .split("-")
    .map((word) => (word.length ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Left-side jump list of a paper's sections, derived from the distinct
 * `sectionId`s across that paper's chunks (in first-seen order).
 */
export function SectionNav({
  chunks,
  activeSectionId,
  onSelect,
}: {
  chunks: Chunk[];
  activeSectionId?: string | null;
  onSelect?: (sectionId: string) => void;
}) {
  const sectionIds: string[] = [];
  for (const chunk of chunks) {
    if (chunk.sectionId && !sectionIds.includes(chunk.sectionId)) {
      sectionIds.push(chunk.sectionId);
    }
  }

  if (sectionIds.length === 0) {
    return <p className="font-sans text-xs text-ink-faint">No sections available.</p>;
  }

  return (
    <nav aria-label="Paper sections" className="flex flex-col gap-1">
      <h3 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        Sections
      </h3>
      <ul className="flex flex-col gap-0.5">
        {sectionIds.map((sectionId) => {
          const active = sectionId === activeSectionId;
          return (
            <li key={sectionId}>
              <button
                type="button"
                onClick={() => onSelect?.(sectionId)}
                className={clsx(
                  "w-full rounded px-2 py-1 text-left font-sans text-sm transition-colors",
                  active
                    ? "bg-surface-raised text-ink border border-border-strong"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink",
                )}
              >
                {labelForSection(sectionId)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
