import Link from "next/link";
import { type CatalogPaper, licenceLabel, paperAddedAt } from "@/lib/data/papers";

/**
 * One catalog paper as a dense hairline row, shared by every /open tab.
 *
 * The mindmap slot renders two structurally different elements rather than one
 * disabled control: "in progress" is a status, not a broken button, and a dead
 * button invites a click that does nothing and reads as a bug.
 */
export function PaperRow({
  paper,
  dateLabel,
}: {
  paper: CatalogPaper;
  /**
   * Overrides the "Added <catalog date>" line. A user profile is showing when
   * that person posted the paper, which is a different fact from when the
   * catalog acquired it, so it must not silently reuse the catalog's date.
   */
  dateLabel?: string;
}) {
  return (
    <li className="py-s-4">
      <div className="flex flex-col gap-s-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/paper/${paper.slug}`}
            className="font-sans text-base font-medium text-accent-text transition-colors duration-fast ease-out hover:underline"
          >
            {paper.title}
          </Link>

          <p className="mt-s-1 font-sans text-sm text-ink-muted">
            {paper.authors.join(", ")}
          </p>

          <p className="mt-s-2 flex flex-wrap items-center gap-x-s-3 gap-y-s-1 font-mono text-xs text-ink-faint">
            <span>{paper.year}</span>
            <span aria-hidden>/</span>
            <span>{paper.venue}</span>
            <span aria-hidden>/</span>
            <span>{paper.field}</span>
            <span aria-hidden>/</span>
            <span>{licenceLabel(paper.licence)}</span>
          </p>

          <p className="mt-s-2 font-mono text-[0.6875rem] text-ink-faint">
            {dateLabel ?? `Added ${paperAddedAt(paper)}`}
            {" / "}
            <a
              href={paper.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors duration-fast ease-out hover:text-ink"
            >
              Source
            </a>
          </p>
        </div>

        <div className="shrink-0 sm:pl-s-4">
          {paper.workspaceId ? (
            <Link
              href={`/w/${paper.workspaceId}/canvas`}
              className="inline-flex items-center rounded-full border border-border-strong bg-surface-raised px-s-4 py-s-2 font-sans text-sm text-ink transition-colors duration-fast ease-out hover:border-accent hover:text-accent"
            >
              Open mindmap
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-full border border-dashed border-border px-s-4 py-s-2 font-mono text-xs text-ink-faint">
              Mindmap in progress
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
