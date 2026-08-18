import Link from "next/link";
import clsx from "clsx";

const TABS = [
  ["outline", "Outline"],
  ["audit", "Audit"],
  ["learn", "Learn"],
] as const;

/**
 * Issue #90: Audit/Outline/Learn/Canvas each hand-rolled their own one-link
 * "back to reader" micro-header instead of the persistent 4-tab row
 * ReaderClient.tsx's own header already renders -- once inside any one
 * subpage, reaching another meant returning to the hub first, and the tab
 * chrome that was visible a second ago just disappeared. This is that same
 * row, shared, so every reader route (including the main reader itself)
 * renders identical navigation rather than four independent copies that can
 * drift.
 */
export function ReaderTabsNav({
  workspaceId,
  active,
}: {
  workspaceId: string;
  active: "reader" | "outline" | "audit" | "learn" | "canvas";
}) {
  return (
    <nav className="flex shrink-0 flex-wrap items-center gap-s-4 font-sans text-[13px] text-ink-faint">
      <Link
        href={`/w/${workspaceId}`}
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
        className={clsx(
          "rounded-full border border-border px-s-3 py-1 transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink",
          active === "canvas" && "border-border-strong font-medium text-ink",
        )}
      >
        Explore graph
      </Link>
    </nav>
  );
}
