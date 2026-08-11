"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MessageCircle, Heart } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PillarChip } from "@/components/ui/PillarChip";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Reveal } from "@/components/ui/Reveal";
import { mockPapers, topicLabelForPillar, formatMockDate, type MockPaper } from "@/lib/mock/discover";

type SortValue = "recent" | "trending" | "discussed";

const SORT_TABS: TabItem[] = [
  { value: "recent", label: "Recent" },
  { value: "trending", label: "Trending" },
  { value: "discussed", label: "Most discussed" },
];

// No real pagination component -- ~10 mock rows, a "Load more" button that
// disables itself once the array is exhausted is enough (Task 6 brief).
const PAGE_SIZE = 6;

/**
 * Card for one paper in the grid. Kept local to this file per the task's
 * code-organization note: promoting it to components/site/PaperCard.tsx is a
 * later task's call (Task 7 reuses it on /u/[username] and decides then).
 */
function PaperCard({ paper }: { paper: MockPaper }) {
  return (
    <Link
      href={`/paper/${paper.slug}`}
      className="group flex flex-col gap-s-3 rounded-lg border border-border bg-surface-raised p-s-4 transition-colors duration-base ease-out hover:border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <PillarChip pillarIndex={paper.pillarIndex} label={topicLabelForPillar(paper.pillarIndex)} />
        {paper.openAccess ? (
          <Badge dotClassName="bg-accent" className="shrink-0 text-ink-muted">
            Open access
          </Badge>
        ) : (
          <Badge className="shrink-0 border-dashed text-ink-faint">Author-published</Badge>
        )}
      </div>

      <h3 className="font-serif text-base leading-snug text-ink transition-colors duration-fast ease-out group-hover:text-accent">
        {paper.title}
      </h3>

      <p className="font-mono text-xs text-ink-faint">
        {paper.authors.join(", ")}
        {paper.venue ? ` · ${paper.venue}` : ""} · {formatMockDate(paper.publishedDate)}
      </p>

      <div className="mt-auto flex items-center gap-4 pt-2 font-mono text-xs text-ink-faint">
        <span className="flex items-center gap-1">
          <Icon icon={MessageCircle} size="xs" /> {paper.discussionCount}
        </span>
        <span className="flex items-center gap-1">
          <Icon icon={Heart} size="xs" /> {paper.likeCount}
        </span>
      </div>
    </Link>
  );
}

/**
 * `/discover` -- browse the curated open-access library plus what other
 * users have published. Client-side search + sort only, no debounce/API
 * (Task 6 brief): filters/sorts the same ~10-row `mockPapers` array in
 * memory. Header/footer come from app/(platform)/layout.tsx.
 */
export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortValue>("recent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? mockPapers.filter(
          (paper) =>
            paper.title.toLowerCase().includes(q) ||
            paper.authors.some((author) => author.toLowerCase().includes(q)) ||
            paper.venue?.toLowerCase().includes(q) ||
            topicLabelForPillar(paper.pillarIndex).toLowerCase().includes(q),
        )
      : mockPapers;

    const sorted = [...matches];
    if (sort === "trending") sorted.sort((a, b) => b.likeCount - a.likeCount);
    else if (sort === "discussed") sorted.sort((a, b) => b.discussionCount - a.discussionCount);
    else sorted.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
    return sorted;
  }, [query, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <main className="flex flex-col">
      {/* Banner header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 pb-10 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Discover</p>
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Browse the public library
        </h1>
        <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
          Curated open-access papers, plus what other researchers have published on Pepiros. Every
          card opens straight into that paper&apos;s grounded summary.
        </p>
      </section>

      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Icon
                  icon={Search}
                  size="sm"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  placeholder="Search title, author, topic..."
                  aria-label="Search papers"
                  className="pl-9"
                />
              </div>
              <Tabs
                tabs={SORT_TABS}
                value={sort}
                onChange={(value) => {
                  setSort(value as SortValue);
                }}
              />
            </div>

            {filtered.length === 0 ? (
              // Task 13 lands a shared EmptyState component; a plain inline
              // message is fine until then (matches Task 9's workspaces
              // zero-state note in the plan).
              <p className="py-16 text-center font-sans text-sm text-ink-faint">
                No papers match &ldquo;{query}&rdquo;. Try a different search.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((paper) => (
                    <PaperCard key={paper.slug} paper={paper} />
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    disabled={!hasMore}
                    onClick={() => {
                      setVisibleCount((count) => count + PAGE_SIZE);
                    }}
                  >
                    {hasMore ? "Load more" : "That's every paper"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
