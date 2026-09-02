"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { buttonClassName } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const TABS = [
  ["outline", "Outline"],
  ["audit", "Audit"],
  ["learn", "Learn"],
] as const;

/**
 * Issue #90: Audit/Outline/Learn/Canvas each hand-rolled their own one-link
 * "back to reader" micro-header instead of the persistent 4-tab row
 * ReaderClient.tsx's own header already renders -- once inside any one
 * subpage, reaching another meant returning to the reader hub first, and
 * the tab chrome that was visible a second ago just disappeared. This is
 * that same row, shared, so every reader route (including the main reader
 * itself) renders identical navigation rather than four independent copies
 * that can drift.
 *
 * Issue #143: Share/Export used to live only in ReaderClient.tsx's own
 * header, so switching to Audit/Outline/Learn/Canvas lost both until you
 * clicked back to Reader first -- moved here (this component, not a
 * separate layout) since every one of those routes already renders this
 * exact nav, so it's the one place a fix reaches all of them without
 * duplicating per-tab.
 *
 * Issue #291: Explore graph, Outline/Audit/Learn, Share, and both exports
 * used to render as eight peer items at identical weight. Explore graph is
 * the product centrepiece and export is a slip-list item; the row gave them
 * the same visual weight (arguably more, since export was two items).
 * Explore graph is now the one filled/primary action, Outline/Audit/Learn
 * are grouped as a visually distinct secondary set, and both exports
 * collapse into one overflow menu (components/ui/Menu.tsx).
 */
export function ReaderTabsNav({
  workspaceId,
  active,
}: {
  workspaceId: string;
  active: "reader" | "outline" | "audit" | "learn" | "canvas";
}) {
  const [sharing, setSharing] = useState(false);

  async function shareWorkspace() {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error(`Share failed (${res.status}).`);
      const { url } = (await res.json()) as { url: string };
      await navigator.clipboard.writeText(url);
      toast.success("Read-only share link copied to clipboard.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create a share link.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-s-3 font-sans text-[13px] text-ink-faint">
      <Link
        href={`/w/${workspaceId}`}
        aria-current={active === "reader" ? "page" : undefined}
        className={clsx(
          "transition-colors duration-fast ease-out hover:text-ink",
          active === "reader" && "font-medium text-ink",
        )}
      >
        Reader
      </Link>

      <div className="flex items-center gap-1 rounded-full border border-border bg-surface-sunken p-0.5">
        {TABS.map(([slug, label]) => (
          <Link
            key={slug}
            href={`/w/${workspaceId}/${slug}`}
            aria-current={active === slug ? "page" : undefined}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs transition-colors duration-fast ease-out",
              active === slug ? "bg-surface-raised font-medium text-ink shadow-e-1" : "hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <Link
        href={`/w/${workspaceId}/canvas`}
        aria-current={active === "canvas" ? "page" : undefined}
        className={buttonClassName("primary", "sm")}
      >
        Explore graph
      </Link>

      <span className="h-4 w-px shrink-0 bg-border" aria-hidden />

      <button
        type="button"
        onClick={() => void shareWorkspace()}
        disabled={sharing}
        className="rounded-full border border-border px-s-3 py-1 transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink disabled:opacity-50"
      >
        {sharing ? "Sharing…" : "Share"}
      </button>

      <Menu
        trigger={
          <span className="flex items-center gap-1 rounded-full border border-border px-s-3 py-1 text-[13px] text-ink-faint transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink">
            Export
            <Icon icon={ChevronDown} size="xs" />
          </span>
        }
        items={[
          {
            label: "Markdown (.md)",
            onSelect: () => {
              window.location.href = `/api/export?workspaceId=${encodeURIComponent(workspaceId)}&format=md`;
            },
          },
          {
            label: "BibTeX (.bib)",
            onSelect: () => {
              window.location.href = `/api/export?workspaceId=${encodeURIComponent(workspaceId)}&format=bibtex`;
            },
          },
        ]}
      />

      {/* Issue #375: (reader) has no layout.tsx of its own and renders no
          SiteHeader/AppTopbar, so this shared nav (already on every /w/*
          route: reader, outline, audit, learn, canvas) is the one place
          that reaches all of them without adding a layout that would
          affect the breakpoint question #363 is still open on. */}
      <ThemeToggle className="ml-auto" />
    </nav>
  );
}
