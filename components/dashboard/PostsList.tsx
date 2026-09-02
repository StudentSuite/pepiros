"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/shadcn/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dot } from "@/components/reading/Article";
import { cn } from "@/lib/utils";
import type { Post, PostStatus } from "@/lib/data/types";
import { CATALOG_BY_ID } from "@/lib/data/papers";

type StatusTab = "all" | PostStatus;

const TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

// Issue #221: this used to recompute a slug from post.title and link
// straight to /paper/{that}, but /paper/[slug] resolves by exact match
// against CatalogPaper.slug (lib/data/papers.ts), which is hand-authored and
// doesn't always match a mechanical slugify() of the title -- 8 of the 14
// seeded papers 404'd this way (e.g. "Deep Residual Learning for Image
// Recognition" slugifies to deep-residual-learning-for-image-recognition,
// but the real catalog slug is deep-residual-learning). Resolve through the
// paper's own id instead, the same real slug FeedClient/u/[username] use.
function paperHref(paperId: string): string | null {
  const paper = CATALOG_BY_ID.get(paperId);
  return paper ? `/paper/${paper.slug}` : null;
}

/**
 * The author's own posts, as a list rather than a data grid.
 *
 * The table version was the wrong instrument. It put six columns of metadata at
 * equal weight beside a paper title that then had to truncate at ~40 characters,
 * and below the md breakpoint the whole thing became a horizontal scroller. A
 * writer looking at their own posts wants to recognise the paper first; the
 * grounding numbers are secondary and read fine on one muted line.
 *
 * Selection, bulk delete and optimistic removal are kept, because those were
 * genuinely useful. They just no longer require a grid to hang off.
 */
export function PostsList({
  posts,
  onDelete,
}: {
  posts: Post[];
  onDelete: (ids: string[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();

  const [optimisticPosts, removeOptimistic] = useOptimistic(
    posts,
    (state: Post[], ids: string[]) => state.filter((p) => !ids.includes(p.id)),
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimisticPosts
      .filter((p) => {
        if (tab !== "all" && p.status !== tab) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.authors.join(" ").toLowerCase().includes(q) ||
          p.venue.toLowerCase().includes(q) ||
          p.field.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  }, [optimisticPosts, tab, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: optimisticPosts.length };
    for (const p of optimisticPosts) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [optimisticPosts]);

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function confirmDelete() {
    const ids = [...selected];
    setConfirming(false);
    setSelected(new Set());
    startTransition(async () => {
      removeOptimistic(ids);
      try {
        await onDelete(ids);
        toast.success(ids.length === 1 ? "Post deleted" : `${ids.length} posts deleted`);
      } catch {
        toast.error("Could not delete. The list has been restored.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-s-4 border-b border-border pb-s-4">
        <div className="flex items-center gap-s-4">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "relative pb-1 font-sans text-sm transition-colors duration-fast ease-out",
                tab === t.value
                  ? "font-medium text-ink after:absolute after:inset-x-0 after:-bottom-[17px] after:h-px after:bg-ink"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              {t.label}
              <span className="ml-1.5 font-mono text-[10px] text-ink-faint">
                {counts[t.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto min-w-0 flex-1 basis-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your posts"
            aria-label="Search posts"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {/* Bulk bar appears only with a selection, so the resting state is calm. */}
      {selected.size > 0 && (
        <div className="flex items-center gap-s-3 border-b border-border py-s-3">
          <span className="font-sans text-[13px] text-ink-muted">
            {selected.size} selected
          </span>
          <Button
            variant="danger"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Cancel
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="py-s-6">
          <EmptyState
            icon={FileText}
            title={query ? "Nothing matches that search." : "Nothing here yet."}
            description={
              query
                ? "Try a different title, author, or field."
                : tab === "draft"
                  ? "Drafts collect here before you publish them."
                  : "Publish a paper and it will appear in this list."
            }
          />
        </div>
      ) : (
        <ul>
          {rows.map((post) => {
            const checked = selected.has(post.id);
            return (
              <li
                key={post.id}
                className={cn(
                  "flex gap-s-4 border-b border-border py-s-5",
                  checked && "bg-subtle/40",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(post.id, Boolean(v))}
                  aria-label={`Select ${post.title}`}
                  className="mt-1.5 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-s-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {post.field}
                    </span>
                    {post.status !== "published" && (
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider",
                          post.status === "draft"
                            ? "text-pillar-text-2"
                            : "text-ink-faint",
                        )}
                      >
                        {post.status}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 font-sans font-semibold text-lg leading-snug text-ink">
                    {(() => {
                      const href = paperHref(post.paperId);
                      return href ? (
                        <Link href={href} className="hover:text-accent-text">
                          {post.title}
                        </Link>
                      ) : (
                        post.title
                      );
                    })()}
                  </h3>

                  <p className="mt-1 truncate font-sans text-[13px] text-ink-faint">
                    {post.authors[0]}
                    {post.authors.length > 1 ? " et al." : ""} · {post.venue} ·{" "}
                    {post.year}
                  </p>

                  <div className="mt-s-2 flex flex-wrap items-center gap-x-s-3 gap-y-1 font-sans text-[13px] text-ink-faint">
                    {/* Issue #282: both are verifier outputs, so both are
                        omitted rather than invented when there is no
                        measurement behind them. */}
                    {post.groundingCoverage !== null && (
                      <>
                        <span>{Math.round(post.groundingCoverage * 100)}% grounded</span>
                        <Dot />
                      </>
                    )}
                    {post.dropRate !== null && (
                      <>
                        <span>{Math.round(post.dropRate * 100)}% dropped</span>
                        <Dot />
                      </>
                    )}
                    <span>{post.publishedAt}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size === 1 ? "this post" : `${selected.size} posts`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post and its reach history, and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
