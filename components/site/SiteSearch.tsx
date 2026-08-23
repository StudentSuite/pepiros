"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FileText, MessageSquare, Search, UserRound } from "lucide-react";
import type { SearchHit, SearchResults } from "@/lib/data/types";

/**
 * Header search across papers, people and discussions.
 *
 * A combobox, built to the WAI-ARIA pattern rather than as a text input with a
 * div under it: the input owns `role="combobox"` with `aria-expanded` and
 * `aria-activedescendant`, the panel is a `listbox`, and each row is an
 * `option`. That is what makes the arrow keys announce results to a screen
 * reader instead of silently moving a highlight nobody can hear.
 *
 * FOCUS STAYS IN THE INPUT the whole time. Moving DOM focus onto each row as
 * you arrow through would mean every keystroke also has to put it back before
 * the next character types, which is the usual way these break.
 *
 * Results are grouped by kind rather than merged into one ranked list, for the
 * reason lib/data/adapter.ts's search() gives: a title hit on a paper and a
 * substring hit in a comment body are not comparable quantities, and inventing
 * a ranking between them would be arbitrary dressed up as clever. The flat
 * `rows` array below exists only so the arrow keys can walk the groups in
 * visual order.
 */

const DEBOUNCE_MS = 180;
/** Matches MIN_QUERY_LENGTH in lib/data/adapter.ts. */
const MIN_QUERY_LENGTH = 2;

const EMPTY: SearchResults = { papers: [], people: [], discussions: [] };

const GROUPS: { key: keyof SearchResults; label: string; icon: React.ReactNode }[] = [
  { key: "papers", label: "Papers", icon: <FileText className="size-3.5" /> },
  { key: "people", label: "People", icon: <UserRound className="size-3.5" /> },
  { key: "discussions", label: "Discussions", icon: <MessageSquare className="size-3.5" /> },
];

export function SiteSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows: SearchHit[] = GROUPS.flatMap((g) => results[g.key]);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    // One AbortController per debounced request, so a slow answer for "att"
    // cannot land after a fast one for "attention" and overwrite it. Without
    // this the results race the typing and the list flickers backwards.
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setResults((await res.json()) as SearchResults);
        setActive(-1);
      } catch (err) {
        // An abort is the expected path on every keystroke, not a failure.
        if ((err as Error)?.name === "AbortError") return;
        setResults(EMPTY);
      } finally {
        // Guard the same way: an aborted request must not clear the spinner
        // that its replacement just set.
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const go = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      setQuery("");
      router.push(hit.href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!rows.length) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      // Wraps at both ends, so holding an arrow key never dead-ends.
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return ((next % rows.length) + rows.length) % rows.length;
      });
      return;
    }
    if (e.key === "Enter" && active >= 0) {
      const hit = rows[active];
      // `active` is clamped by the arrow handler, but a results update between
      // keydown and here can shrink `rows` under it. Checking beats asserting.
      if (!hit) return;
      e.preventDefault();
      go(hit);
    }
  }

  const showPanel = open && trimmed.length >= MIN_QUERY_LENGTH;
  // Running index across the groups, so `active` lines up with `rows`.
  let cursor = -1;

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        aria-label="Search papers, people and discussions"
        placeholder="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={clsx(
          "h-9 w-full rounded-full border border-border bg-surface-raised pl-9 pr-3",
          "font-sans text-sm text-ink placeholder:text-ink-faint",
          "outline-none transition-colors duration-fast ease-out",
          "hover:border-border-strong focus-visible:shadow-glow-accent",
        )}
      />

      {showPanel && (
        <div
          className={clsx(
            "absolute right-0 top-full z-50 mt-s-2 w-[min(28rem,calc(100vw-2rem))]",
            "overflow-hidden rounded-xl border border-border bg-surface-raised shadow-e-3",
          )}
        >
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[70vh] overflow-y-auto py-s-2">
            {rows.length === 0 ? (
              <li className="px-s-4 py-s-3 font-sans text-sm text-ink-muted" role="presentation">
                {loading ? "Searching..." : `Nothing matches "${trimmed}".`}
              </li>
            ) : (
              GROUPS.map((group) => {
                const hits = results[group.key];
                if (!hits.length) return null;
                return (
                  <li key={group.key} role="presentation">
                    <p className="kicker flex items-center gap-s-2 px-s-4 pb-s-1 pt-s-2">
                      <span aria-hidden>{group.icon}</span>
                      {group.label}
                    </p>
                    <ul role="presentation">
                      {hits.map((hit) => {
                        cursor += 1;
                        const index = cursor;
                        return (
                          <li
                            key={`${hit.kind}-${hit.href}-${index}`}
                            id={`${listId}-opt-${index}`}
                            role="option"
                            aria-selected={active === index}
                            onMouseEnter={() => setActive(index)}
                            // pointerdown, not click: the input's blur would
                            // otherwise close the panel before the click lands.
                            onPointerDown={(e) => {
                              e.preventDefault();
                              go(hit);
                            }}
                            className={clsx(
                              "cursor-pointer px-s-4 py-s-2 transition-colors duration-fast ease-out",
                              active === index ? "bg-surface-sunken" : "hover:bg-surface-sunken",
                            )}
                          >
                            <div className="flex items-baseline justify-between gap-s-3">
                              <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink">
                                {hit.title}
                              </span>
                              {hit.meta && (
                                <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                                  {hit.meta}
                                </span>
                              )}
                            </div>
                            <p className="truncate font-sans text-[13px] text-ink-muted">
                              {hit.subtitle}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
