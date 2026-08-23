"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { fieldsPresentIn, filterByField } from "@/lib/site/catalogBrowser";
import type { CatalogPaper } from "@/lib/data/papers";
import type { ResearchField } from "@/lib/data/types";

/**
 * Issue #296: "discipline chips underneath, which filter the strip below
 * rather than being decoration" plus "a strip of papers someone has
 * actually read, with author and year, linking into the reader." Fields
 * are derived from the real catalog (lib/site/catalogBrowser.ts), so a chip
 * is never offered for a field with nothing behind it.
 *
 * Every catalog entry links to /paper/[slug], not directly into a reader
 * workspace: none are indexed yet (issue #279 -- needs a local Python
 * interpreter and the production DATABASE_URL, unreachable from this
 * sandbox), so paper.workspaceId is undefined for all 24. The paper page
 * itself already renders the honest "not indexed yet" state (issue #255)
 * rather than this component silently linking somewhere real-looking.
 */
export function CatalogBrowser({ papers }: { papers: CatalogPaper[] }) {
  const fields = fieldsPresentIn(papers);
  const [selected, setSelected] = useState<ResearchField | null>(null);
  const filtered = filterByField(papers, selected);

  return (
    <div className="mx-auto mt-s-6 w-full max-w-3xl">
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Filter by field">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={clsx(
            "rounded-full border px-2.5 py-1 font-sans text-xs transition-colors duration-fast ease-out",
            selected === null
              ? "border-accent bg-accent-wash text-ink"
              : "border-border-strong text-ink-muted hover:border-accent hover:text-ink",
          )}
        >
          All
        </button>
        {fields.map((field) => (
          <button
            key={field}
            type="button"
            onClick={() => setSelected(field)}
            className={clsx(
              "rounded-full border px-2.5 py-1 font-sans text-xs transition-colors duration-fast ease-out",
              selected === field
                ? "border-accent bg-accent-wash text-ink"
                : "border-border-strong text-ink-muted hover:border-accent hover:text-ink",
            )}
          >
            {field}
          </button>
        ))}
      </div>

      <ul className="mt-s-5 flex flex-col divide-y divide-border">
        {filtered.map((paper) => (
          <li key={paper.id}>
            <Link
              href={`/paper/${paper.slug}`}
              className="flex items-baseline justify-between gap-s-3 py-s-3 transition-colors duration-fast ease-out hover:bg-surface-sunken"
            >
              <span className="truncate font-sans text-[15px] text-ink">{paper.title}</span>
              <span className="shrink-0 font-mono text-xs text-ink-faint">
                {paper.authors[0]}
                {paper.authors.length > 1 ? " et al." : ""}, {paper.year}
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-s-3 font-sans text-sm text-ink-faint">No papers in this field yet.</li>
        )}
      </ul>
    </div>
  );
}
