import Link from "next/link";
import { fieldsPresentIn } from "@/lib/site/catalogBrowser";
import type { CatalogPaper } from "@/lib/data/papers";

/**
 * Block 6 (plan §6.1): Cohere's seven industry tiles, replaced with the
 * fields actually present in the catalog.
 *
 * HONEST ADAPTATION, stated plainly. The plan describes this block as
 * mapping "exactly onto the seven citation pillars", but there is no real
 * seven-item discipline taxonomy anywhere in this codebase to map onto: the
 * pillar tokens (--pillar-1..7 in app/globals.css) are a generic, rotating
 * colour assignment for claim categories inside a workspace, not a fixed
 * list of research disciplines, and the catalog's own RESEARCH_FIELDS has
 * twelve entries. Forcing exactly seven invented discipline names to match
 * a colour count would be fabricating a taxonomy for a product whose whole
 * argument is not fabricating things. This renders however many fields the
 * real catalog actually has (`fieldsPresentIn`, the same helper
 * CatalogBrowser's chip row already uses), cycling through the seven pillar
 * fills for the tile colour so the visual rhythm the plan wants still
 * holds, just without a false 1:1 claim.
 *
 * Each tile's count is computed from the real catalog, never a placeholder.
 * The pillar colour carries real visual weight here (a top edge, not a
 * 2.5px dot) -- a first pass under-designed this to a single tiny coloured
 * dot on an otherwise plain bordered box, which read as an unfinished
 * default rather than a deliberate tile grid.
 *
 * Summary line above the grid, added 2026-08-23: the section was a small
 * tile grid with nothing else, thin against its own min-h-[72vh] wrapper.
 * `papers.length` and `fields.length` are the same real numbers the tiles
 * below already sum to, just stated once up top before the reader counts
 * them tile by tile.
 */
export function DisciplineGrid({ papers }: { papers: CatalogPaper[] }) {
  const fields = fieldsPresentIn(papers);
  const countByField = new Map<string, number>();
  for (const p of papers) countByField.set(p.field, (countByField.get(p.field) ?? 0) + 1);

  return (
    <div>
      <p className="mb-s-5 font-sans text-base text-ink-muted">
        <span className="font-mono text-2xl font-medium text-ink">{papers.length}</span> papers
        across <span className="font-mono text-2xl font-medium text-ink">{fields.length}</span>{" "}
        fields in the open-access catalog.
      </p>
      <div className="grid grid-cols-2 gap-s-3 sm:grid-cols-3 lg:grid-cols-4">
        {fields.map((field, i) => {
          const pillarVar = `var(--pillar-${(i % 7) + 1}-rgb)`;
          return (
            <Link
              key={field}
              href="/discover"
              className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface-raised p-s-4 transition-colors duration-fast ease-out hover:border-border-strong"
            >
              {/* Top edge accent, the pillar colour with real presence rather
                  than a token dot -- and it brightens on hover rather than
                  sitting static, so the tile reads as interactive. */}
              <span
                className="absolute inset-x-0 top-0 h-[3px] transition-opacity duration-fast ease-out"
                style={{ backgroundColor: `rgb(${pillarVar})` }}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-0 blur-2xl transition-opacity duration-base ease-out group-hover:opacity-25"
                style={{ backgroundColor: `rgb(${pillarVar})` }}
                aria-hidden
              />
              <span className="relative mt-s-2 block font-sans text-sm font-medium text-ink">
                {field}
              </span>
              <span className="relative mt-s-1 block font-mono text-xs text-ink-faint">
                {countByField.get(field)} {countByField.get(field) === 1 ? "paper" : "papers"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
