"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ExternalLink,
  FileText,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Badge } from "@/components/shadcn/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
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
import { Label } from "@/components/shadcn/label";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post, PostStatus } from "@/lib/data/types";

type SortKey = "title" | "publishedAt" | "groundingCoverage" | "dropRate";
type StatusTab = "all" | PostStatus;

const TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function PostsTable({
  posts,
  onDelete,
}: {
  posts: Post[];
  onDelete: (ids: string[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "publishedAt",
    dir: "desc",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);
  const [, startTransition] = useTransition();

  // Optimistic UI: a delete leaves the list immediately rather than waiting on
  // the round trip, so the table feels responsive. If the call rejects, React
  // reverts the optimistic state and the catch surfaces a toast.
  const [optimisticPosts, removeOptimistic] = useOptimistic(
    posts,
    (state: Post[], ids: string[]) => state.filter((p) => !ids.includes(p.id)),
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = optimisticPosts.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.authors.join(" ").toLowerCase().includes(q) ||
        p.venue.toLowerCase().includes(q) ||
        p.field.toLowerCase().includes(q)
      );
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [optimisticPosts, tab, query, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = selected.size > 0;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function sortBy(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
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
    <Card className="border-border bg-card">
      {/* Controls. Tabs switch view without touching the sidebar or the URL. */}
      <div className="flex flex-wrap items-center gap-s-3 border-b border-border p-s-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
          <TabsList className="h-8">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-s-3 text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, venue, field"
            aria-label="Search posts"
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Popover: non-blocking display settings, safe to click away from. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <SlidersHorizontal className="size-3.5" />
              Display
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
              Columns
            </p>
            <div className="mt-s-3 flex items-center gap-s-2">
              <Checkbox
                id="col-coverage"
                checked={showCoverage}
                onCheckedChange={(v) => setShowCoverage(Boolean(v))}
              />
              <Label htmlFor="col-coverage" className="text-xs font-normal">
                Grounding coverage
              </Label>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bulk actions appear only once a selection exists. */}
        {someChecked && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-3.5" />
            Delete {selected.size}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-s-6">
          <EmptyState
            icon={FileText}
            title={query ? "Nothing matches that search." : "No posts here yet."}
            description={
              query
                ? "Try a different title, author, or field."
                : tab === "draft"
                  ? "Drafts you start will collect here before you publish them."
                  : "Publish a paper and it will show up in this list."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => toggleAll(Boolean(v))}
                    aria-label="Select all posts"
                  />
                </TableHead>
                <SortableHead label="Paper" active={sort} onClick={() => sortBy("title")} k="title" />
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Field
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Status
                </TableHead>
                {showCoverage && (
                  <SortableHead
                    label="Coverage"
                    active={sort}
                    onClick={() => sortBy("groundingCoverage")}
                    k="groundingCoverage"
                  />
                )}
                <SortableHead
                  label="Drop rate"
                  active={sort}
                  onClick={() => sortBy("dropRate")}
                  k="dropRate"
                />
                <SortableHead
                  label="Published"
                  active={sort}
                  onClick={() => sortBy("publishedAt")}
                  k="publishedAt"
                />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((post) => (
                <TableRow
                  key={post.id}
                  data-state={selected.has(post.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(post.id)}
                      onCheckedChange={(v) => toggleOne(post.id, Boolean(v))}
                      aria-label={`Select ${post.title}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    <p className="truncate font-serif text-sm text-ink">{post.title}</p>
                    <p className="truncate font-mono text-[11px] text-ink-faint">
                      {post.authors[0]}
                      {post.authors.length > 1 ? " et al." : ""} · {post.venue} · {post.year}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="font-sans text-xs text-ink-muted">{post.field}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-wider",
                        post.status === "published" && "border-pillar-7/40 text-pillar-text-7",
                        post.status === "draft" && "border-pillar-2/40 text-pillar-text-2",
                        post.status === "archived" && "border-border text-ink-faint",
                      )}
                    >
                      {post.status}
                    </Badge>
                  </TableCell>
                  {showCoverage && (
                    <TableCell className="font-mono text-xs text-ink-muted">
                      {pct(post.groundingCoverage)}
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs text-ink-muted">
                    {pct(post.dropRate)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ink-faint">
                    {post.publishedAt}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open source for ${post.title}`}
                      className="text-ink-faint transition-colors duration-fast ease-out hover:text-accent-text"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal, not a popover: destructive and must be resolved. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size === 1 ? "this post" : `${selected.size} posts`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post and its reach history. It cannot be undone.
              On the demo account nothing is permanently destroyed, so this
              resets when the server restarts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SortableHead({
  label,
  k,
  active,
  onClick,
}: {
  label: string;
  k: SortKey;
  active: { key: SortKey; dir: "asc" | "desc" };
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest transition-colors duration-fast ease-out hover:text-ink",
          active.key === k ? "text-ink" : "text-ink-faint",
        )}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );
}
