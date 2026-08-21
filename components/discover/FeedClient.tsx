"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import { Dot, FeedItem } from "@/components/reading/Article";
import { EmptyState } from "@/components/ui/EmptyState";
import { RESEARCH_FIELDS } from "@/lib/data/types";
import { paperDek } from "@/lib/data/paperContent";
import type { CatalogPaper } from "@/lib/data/papers";
import type { CatalogStats } from "@/lib/data/seed";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "top" | "discussed";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "top", label: "Top" },
  { value: "discussed", label: "Discussed" },
];

const PAGE = 10;

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const ago = (days: number) =>
  days === 0
    ? "today"
    : days === 1
      ? "yesterday"
      : days < 30
        ? `${days}d ago`
        : days < 365
          ? `${Math.round(days / 30)}mo ago`
          : `${Math.round(days / 365)}y ago`;

export type FeedEntry = CatalogPaper & { stats: CatalogStats };

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
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-s-4 border-b border-border pb-s-4">
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
                "rounded-full border px-s-3 py-1 font-sans text-[13px] transition-colors duration-fast ease-out",
                active
                  ? "border-ink bg-ink text-surface"
                  : "border-border text-ink-faint hover:border-border-strong hover:text-ink",
              )}
            >
              {f}
              <span className="ml-1.5 font-mono text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}
        {field && (
          <button
            type="button"
            onClick={() => setField(null)}
            className="flex items-center gap-1 font-sans text-[13px] text-ink-faint underline underline-offset-2"
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
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {p.field}
                    </span>
                    {p.openAccess && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-pillar-text-7">
                        Open access
                      </span>
                    )}
                  </>
                }
                meta={
                  <>
                    <span>@{p.stats.postedBy}</span>
                    <Dot />
                    <span>{ago(p.stats.postedDaysAgo)}</span>
                    <Dot />
                    {/* Issues #253/#259: reading time and "% grounded" were
                        both fabricated here (a hash, and lib/data/seed.ts
                        respectively), not measured by the verifier. */}
                    <span>{p.stats.comments} comments</span>
                  </>
                }
                aside={
                  <div className="w-24 text-right">
                    <p className="font-mono text-lg tabular-nums text-ink">
                      {compact(p.stats.score)}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      readers
                    </p>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {visible < filtered.length && (
        <div className="flex justify-center pt-s-6">
          <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
            Load more
          </Button>
        </div>
      )}
      {shown.length > 0 && visible >= filtered.length && (
        <p className="pt-s-6 text-center font-sans text-[13px] text-ink-faint">
          That is every paper in the library.
        </p>
      )}
    </div>
  );
}
