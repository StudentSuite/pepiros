"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FeedItem } from "@/components/reading/Article";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RESEARCH_FIELDS } from "@/lib/data/types";
import { paperDek } from "@/lib/data/paperContent";
import { isOpenAccess } from "@/lib/data/papers";
import type { CatalogPaper } from "@/lib/data/papers";
import type { CatalogStats } from "@/lib/data/seed";
import type { EvidenceTier } from "@/types/anchor";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "top" | "discussed";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "top", label: "Top" },
  { value: "discussed", label: "Discussed" },
];

const PAGE = 10;

/** Real claim count and dominant grounding tier for an indexed paper (see discover/page.tsx's realGrounding). Null for a paper with no workspace yet. */
export interface FeedGrounding {
  claimCount: number;
  dominantTier: EvidenceTier;
}

export type FeedEntry = CatalogPaper & { stats: CatalogStats; grounding: FeedGrounding | null };

function authorLine(authors: string[]): string {
  if (authors.length <= 2) return authors.join(" & ");
  return `${authors[0]} et al.`;
}

/**
 * The public library, as a publication feed.
 *
 * Title-led rows separated by hairlines, in one reading measure. The previous
 * link-aggregator treatment put a score rail and a badge cluster before the
 * title, which meant the first thing read on every row was a number rather than
 * what the paper is. Here the title leads, the standfirst explains, and the
 * metadata sits underneath in one muted line.
 *
 * Filters live above the feed rather than in a right rail, so the column stays
 * centred and the page reads as a publication rather than a dashboard.
 */
export function FeedClient({ items }: { items: FeedEntry[] }) {
  const [sort, setSort] = useState<SortKey>("latest");
  const [query, setQuery] = useState("");
  const [field, setField] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const fieldsInUse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of items) counts.set(p.field, (counts.get(p.field) ?? 0) + 1);
    return RESEARCH_FIELDS.filter((f) => counts.has(f)).map((f) => ({
      field: f,
      count: counts.get(f) ?? 0,
    }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (field && p.field !== field) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.authors.join(" ").toLowerCase().includes(q) ||
        p.venue.toLowerCase().includes(q) ||
        p.field.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "top") return b.stats.score - a.stats.score;
      if (sort === "discussed") return b.stats.comments - a.stats.comments;
      return a.stats.postedDaysAgo - b.stats.postedDaysAgo;
    });
  }, [items, query, field, sort]);

  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* Controls -- sticky just below the site header (--topbar), so sort
          and search stay reachable while scanning a long feed. */}
      <div className="sticky top-[var(--topbar)] z-10 flex flex-wrap items-center gap-s-4 border-b border-border bg-surface pb-s-4 pt-s-4">
        <div className="flex items-center gap-s-4">
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setSort(s.value);
                setVisible(PAGE);
              }}
              className={cn(
                "relative pb-1 font-sans text-sm transition-colors duration-fast ease-out",
                sort === s.value
                  ? "font-medium text-ink after:absolute after:inset-x-0 after:-bottom-[17px] after:h-px after:bg-ink"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto min-w-0 flex-1 basis-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE);
            }}
            placeholder="Search papers"
            aria-label="Search the library"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {/* Field chips */}
      <div className="flex flex-wrap items-center gap-s-2 py-s-4">
        {fieldsInUse.map(({ field: f, count }) => {
          const active = field === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => {
                setField(active ? null : f);
                setVisible(PAGE);
              }}
              className={cn(
                "rounded-full border px-s-3 py-1 font-sans text-sm transition-colors duration-fast ease-out",
                active
                  ? "border-ink bg-ink text-surface"
                  : "border-border text-ink-faint hover:border-border-strong hover:text-ink",
              )}
            >
              {f}
              <span className="ml-1.5 font-mono text-2xs opacity-60">{count}</span>
            </button>
          );
        })}
        {field && (
          <button
            type="button"
            onClick={() => setField(null)}
            className="flex items-center gap-1 font-sans text-sm text-ink-faint underline underline-offset-2"
          >
            <X className="size-3" />
            Clear
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`Nothing matches ${query ? `"${query}"` : "that filter"}.`}
          description="Try a broader search, or clear the field filter."
        />
      ) : (
        <div className="border-t border-border pt-s-6">
          {shown.map((p) => {
            return (
              <FeedItem
                key={p.id}
                href={`/paper/${p.slug}`}
                title={p.title}
                dek={paperDek(p)}
                tags={
                  <>
                    <span className="rounded-full border border-border px-s-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-ink-faint">
                      {p.field}
                    </span>
                    {/* Issue #285: only shown for a licence that actually
                        supports the claim. An unverified entry gets no badge
                        rather than an optimistic one. */}
                    {isOpenAccess(p.licence) && (
                      <span className="font-mono text-2xs uppercase tracking-wider text-pillar-text-7">
                        Open access
                      </span>
                    )}
                  </>
                }
                meta={<span>{authorLine(p.authors)}</span>}
                aside={
                  // Real claim count + the paper's dominant grounding tier
                  // (issue #299) -- not the fabricated "readers" score this
                  // replaced. A paper with no workspace yet says so plainly
                  // rather than showing an invented number.
                  <div className="w-28 text-right">
                    {p.grounding ? (
                      <>
                        <p className="font-mono text-lg tabular-nums text-ink">
                          {p.grounding.claimCount}
                        </p>
                        <p className="font-mono text-2xs uppercase tracking-wider text-ink-faint">
                          claims
                        </p>
                        <div className="mt-1 flex justify-end">
                          <EvidenceBadge tier={p.grounding.dominantTier} />
                        </div>
                      </>
                    ) : (
                      <p className="font-mono text-2xs uppercase tracking-wider text-ink-faint">
                        Not yet indexed
                      </p>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {visible < filtered.length && (
        <div className="flex justify-center pt-s-6">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>
            Load more
          </Button>
        </div>
      )}
      {shown.length > 0 && visible >= filtered.length && (
        <p className="pt-s-6 text-center font-sans text-sm text-ink-faint">
          That is every paper in the library.
        </p>
      )}
    </div>
  );
}
