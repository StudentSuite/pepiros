"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowBigUp,
  ExternalLink,
  MessageSquare,
  Search,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import { Badge } from "@/components/shadcn/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { RESEARCH_FIELDS } from "@/lib/data/types";
import type { CatalogPaper } from "@/lib/data/papers";
import type { CatalogStats } from "@/lib/data/seed";
import { cn } from "@/lib/utils";

type SortKey = "trending" | "new" | "discussed";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "new", label: "New" },
  { value: "discussed", label: "Most discussed" },
];

const PAGE = 8;

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const ago = (days: number) =>
  days === 0
    ? "today"
    : days === 1
      ? "1 day ago"
      : days < 30
        ? `${days} days ago`
        : days < 60
          ? "1 month ago"
          : `${Math.round(days / 30)} months ago`;

export type FeedItem = CatalogPaper & { stats: CatalogStats };

/**
 * The public library feed.
 *
 * Shaped like a link aggregator rather than a card grid, because the unit here
 * is "a paper someone posted" and the useful comparison is vertical: score,
 * title, who posted it, how much discussion. A grid of equal-weight cards
 * hides exactly the ranking signal this view exists to show.
 *
 * Score is engagement on Pepiros, not a citation count. It is labelled that way
 * so it cannot be mistaken for a bibliometric.
 */
export function FeedClient({ items }: { items: FeedItem[] }) {
  const [sort, setSort] = useState<SortKey>("trending");
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (fields.size > 0 && !fields.has(p.field)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.authors.join(" ").toLowerCase().includes(q) ||
        p.venue.toLowerCase().includes(q) ||
        p.field.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sort === "new") return a.stats.postedDaysAgo - b.stats.postedDaysAgo;
      if (sort === "discussed") return b.stats.comments - a.stats.comments;
      return b.stats.score - a.stats.score;
    });
  }, [items, query, fields, sort]);

  const shown = filtered.slice(0, visible);

  function toggleField(f: string) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
    setVisible(PAGE);
  }

  return (
    <div className="flex flex-col gap-s-5 lg:flex-row">
      {/* Feed */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-s-3">
          <Tabs
            value={sort}
            onValueChange={(v) => {
              setSort(v as SortKey);
              setVisible(PAGE);
            }}
          >
            <TabsList className="h-9">
              {SORTS.map((s) => (
                <TabsTrigger key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE);
              }}
              placeholder="Search title, author, venue, field"
              aria-label="Search the library"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {fields.size > 0 && (
          <div className="mt-s-3 flex flex-wrap items-center gap-s-2">
            {[...fields].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleField(f)}
                className="flex items-center gap-1 rounded-full border border-accent bg-accent-wash px-s-3 py-1 font-sans text-xs text-accent-text"
              >
                {f}
                <X className="size-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFields(new Set())}
              className="font-sans text-xs text-ink-faint underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="mt-s-5 rounded-md border border-border bg-card">
            <EmptyState
              icon={Search}
              title={`Nothing matches ${query ? `"${query}"` : "those filters"}.`}
              description="Try a broader search, or clear the field filters."
            />
          </div>
        ) : (
          <ul className="mt-s-4 overflow-hidden rounded-md border border-border bg-card">
            {shown.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  "flex gap-s-4 p-s-4 transition-colors duration-fast ease-out hover:bg-subtle/60",
                  i > 0 && "border-t border-border",
                )}
              >
                {/* Score rail */}
                <div className="flex w-10 shrink-0 flex-col items-center pt-0.5">
                  <ArrowBigUp className="size-4 text-ink-faint" strokeWidth={1.5} />
                  <span className="font-mono text-xs text-ink">
                    {compact(p.stats.score)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-s-2">
                    <button
                      type="button"
                      onClick={() => toggleField(p.field)}
                      className="rounded-full border border-border px-s-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition-colors duration-fast ease-out hover:border-accent hover:text-accent-text"
                    >
                      {p.field}
                    </button>
                    {p.openAccess && (
                      <Badge
                        variant="outline"
                        className="border-pillar-7/40 font-mono text-[10px] text-pillar-text-7"
                      >
                        Open access
                      </Badge>
                    )}
                    <span className="font-mono text-[11px] text-ink-faint">
                      posted by{" "}
                      <Link
                        href={`/u/${p.stats.postedBy}`}
                        className="hover:text-accent-text"
                      >
                        @{p.stats.postedBy}
                      </Link>{" "}
                      {ago(p.stats.postedDaysAgo)}
                    </span>
                  </div>

                  <h2 className="mt-s-2">
                    <Link
                      href={`/paper/${p.slug}`}
                      className="font-serif text-base leading-snug text-ink hover:text-accent-text"
                    >
                      {p.title}
                    </Link>
                  </h2>

                  <p className="mt-s-1 truncate font-mono text-[11px] text-ink-faint">
                    {p.authors.slice(0, 3).join(", ")}
                    {p.authors.length > 3 ? " et al." : ""} · {p.venue} · {p.year}
                  </p>

                  <div className="mt-s-3 flex flex-wrap items-center gap-s-4 font-mono text-[11px] text-ink-faint">
                    <Link
                      href={`/paper/${p.slug}`}
                      className="flex items-center gap-1 hover:text-ink"
                    >
                      <MessageSquare className="size-3.5" />
                      {p.stats.comments} comments
                    </Link>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {compact(p.stats.readers)} readers
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-pillar-7" />
                      {Math.round(p.stats.groundingCoverage * 100)}% grounded
                    </span>
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1 hover:text-ink"
                    >
                      <ExternalLink className="size-3.5" />
                      Source
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {visible < filtered.length && (
          <div className="mt-s-4 flex justify-center">
            <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
              Load more
            </Button>
          </div>
        )}

        {shown.length > 0 && visible >= filtered.length && (
          <p className="mt-s-4 text-center font-mono text-[11px] text-ink-faint">
            That is every paper in the library.
          </p>
        )}
      </div>

      {/* Field rail */}
      <aside className="w-full shrink-0 lg:w-56">
        <div className="rounded-md border border-border bg-card p-s-4 lg:sticky lg:top-[calc(var(--topbar)+1rem)]">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
            Fields
          </p>
          <ul className="mt-s-3 flex flex-wrap gap-s-2 lg:flex-col lg:gap-s-1">
            {RESEARCH_FIELDS.map((f) => {
              const active = fields.has(f);
              const count = items.filter((p) => p.field === f).length;
              if (count === 0) return null;
              return (
                <li key={f}>
                  <button
                    type="button"
                    onClick={() => toggleField(f)}
                    className={cn(
                      "flex w-full items-center justify-between gap-s-2 rounded-md px-s-2 py-1 text-left font-sans text-xs transition-colors duration-fast ease-out",
                      active
                        ? "bg-accent-wash text-accent-text"
                        : "text-ink-muted hover:bg-subtle hover:text-ink",
                    )}
                  >
                    <span>{f}</span>
                    <span className="font-mono text-[10px] text-ink-faint">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
