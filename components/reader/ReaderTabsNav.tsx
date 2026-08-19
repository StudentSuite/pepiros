"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useToastStore } from "@/lib/store/toast";

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
 */
export function ReaderTabsNav({
  workspaceId,
  active,
}: {
  workspaceId: string;
  active: "reader" | "outline" | "audit" | "learn" | "canvas";
}) {
  const pushToast = useToastStore((s) => s.push);
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
      pushToast("Read-only share link copied to clipboard.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not create a share link.", "error");
    } finally {
      setSharing(false);
    }
  }

  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-s-4 font-sans text-[13px] text-ink-faint">
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
      {TABS.map(([slug, label]) => (
        <Link
          key={slug}
          href={`/w/${workspaceId}/${slug}`}
          aria-current={active === slug ? "page" : undefined}
          className={clsx(
            "transition-colors duration-fast ease-out hover:text-ink",
            active === slug && "font-medium text-ink",
          )}
        >
          {label}
        </Link>
      ))}
      <Link
        href={`/w/${workspaceId}/canvas`}
        aria-current={active === "canvas" ? "page" : undefined}
        className={clsx(
          "rounded-full border border-border px-s-3 py-1 transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink",
          active === "canvas" && "border-border-strong font-medium text-ink",
        )}
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
      <a
        href={`/api/export?workspaceId=${encodeURIComponent(workspaceId)}&format=md`}
        className="rounded-full border border-border px-s-3 py-1 transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink"
      >
        Export .md
      </a>
      <a
        href={`/api/export?workspaceId=${encodeURIComponent(workspaceId)}&format=bibtex`}
        className="rounded-full border border-border px-s-3 py-1 transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink"
      >
        Export .bib
      </a>
    </nav>
  );
}
