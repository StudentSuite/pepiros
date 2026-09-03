import Link from "next/link";
import { CHANGELOG } from "@/lib/data/changelog";

/**
 * Block 10 (plan §6.1): "Three cards from changelog and roadmap."
 *
 * Reads the same CHANGELOG module the public /changelog page and the
 * signed-in dashboard's "What's new" panel already read, so this is a third
 * consumer of one source rather than a third copy of the list.
 *
 * REVISED 2026-08-23: all 4 real entries now (was the first 3), and each
 * card shows its first 2 real bullets, not just 1 -- CHANGELOG's own items
 * arrays run 6-10 entries deep per release, so there was real content
 * sitting unused while the section read thin against its min-h-[72vh]
 * wrapper. Still truncated (line-clamp), never inventing summary text.
 */
export function NewsGrid() {
  const entries = CHANGELOG;

  return (
    <div className="grid gap-s-4 sm:grid-cols-2">
      {entries.map((entry, i) => (
        <Link
          key={entry.date}
          href="/changelog"
          className="group relative flex flex-col overflow-hidden rounded-lg border border-border p-s-4 transition-colors duration-fast ease-out hover:border-border-strong hover:bg-surface-raised"
        >
          <span
            className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-fast ease-out group-hover:opacity-100"
            // Violet leads now that it's the primary accent (was
            // amber,green,violet) -- the first card is typically the most
            // recent changelog entry, so it's the one that should carry the
            // new default accent rather than landing on it by array-order
            // accident.
            style={{ backgroundColor: `var(--disp-${["violet", "amber", "green"][i % 3]})` }}
            aria-hidden
          />
          <span className="relative font-mono text-xs text-ink-faint">{entry.date}</span>
          <span className="relative mt-s-2 font-sans text-sm font-semibold leading-snug text-ink">
            {entry.title}
          </span>
          <ul className="relative mt-s-3 flex flex-col gap-1.5">
            {entry.items.slice(0, 2).map((item) => (
              <li key={item} className="flex gap-2 font-sans text-sm leading-relaxed text-ink-muted">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
          {entry.items.length > 2 && (
            <span className="relative mt-s-2 font-mono text-2xs text-ink-faint">
              +{entry.items.length - 2} more
            </span>
          )}
        </Link>
      ))}
      <Link
        href="/roadmap"
        className="flex flex-col items-start justify-center rounded-lg border border-dashed border-border p-s-4 font-sans text-sm text-ink-muted transition-colors duration-fast ease-out hover:border-border-strong hover:text-ink sm:col-span-2"
      >
        See what&rsquo;s next on the roadmap &rarr;
      </Link>
    </div>
  );
}
