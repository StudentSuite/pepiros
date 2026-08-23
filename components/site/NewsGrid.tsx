import Link from "next/link";
import { CHANGELOG } from "@/lib/data/changelog";

/**
 * Block 10 (plan §6.1): "Three cards from changelog and roadmap."
 *
 * Reads the same CHANGELOG module the public /changelog page and the
 * signed-in dashboard's "What's new" panel already read, so this is a third
 * consumer of one source rather than a third copy of the list.
 */
export function NewsGrid() {
  const entries = CHANGELOG.slice(0, 3);

  return (
    <div className="grid gap-s-4 sm:grid-cols-3">
      {entries.map((entry, i) => (
        <Link
          key={entry.date}
          href="/changelog"
          className="group relative flex flex-col overflow-hidden rounded-lg border border-border p-s-4 transition-colors duration-fast ease-out hover:border-border-strong hover:bg-surface-raised"
        >
          <span
            className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-fast ease-out group-hover:opacity-100"
            style={{ backgroundColor: `var(--disp-${["amber", "green", "violet"][i % 3]})` }}
            aria-hidden
          />
          <span className="relative font-mono text-xs text-ink-faint">{entry.date}</span>
          <span className="relative mt-s-2 font-sans text-sm font-semibold leading-snug text-ink">
            {entry.title}
          </span>
          <span className="relative mt-s-2 line-clamp-3 font-sans text-[13px] leading-relaxed text-ink-muted">
            {entry.items[0]}
          </span>
        </Link>
      ))}
      <Link
        href="/roadmap"
        className="flex flex-col items-start justify-center rounded-lg border border-dashed border-border p-s-4 font-sans text-sm text-ink-muted transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink sm:col-span-3"
      >
        See what&rsquo;s next on the roadmap &rarr;
      </Link>
    </div>
  );
}
