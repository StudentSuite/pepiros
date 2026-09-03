"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * Sticky section index for LegalPage, GitHub-docs style (plan §6.4: "sticky
 * section index left at lg, prose right").
 *
 * DERIVED FROM THE REAL DOM, not a prop every page has to maintain. Only 4 of
 * the 8 pages this frame serves (privacy, terms, security, docs) use the
 * shared `<Section title>` sub-component that produces a heading worth
 * indexing; the other 4 (status, faq, roadmap, changelog) either have no
 * real "sections" at all or structure their content differently. Rather than
 * touch all 8 page files to pass an explicit `sections` list, this walks its
 * own rendered content after mount and builds the index from whatever `h2`s
 * are actually there -- zero sections found (status, faq) means it renders
 * nothing, which is correct for those pages, not a bug to work around.
 */
export function LegalPageIndex({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const headings = [...container.querySelectorAll("h2")];
    const built = headings.map((h, i) => {
      // Give every heading a stable id to scroll to, without requiring each
      // of the 8 pages to have assigned one by hand.
      const slug =
        h.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || `section-${i}`;
      if (!h.id) h.id = slug;
      return { id: h.id, label: h.textContent ?? "" };
    });
    setItems(built);
    if (built.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [containerRef]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="hidden shrink-0 lg:sticky lg:top-[calc(var(--topbar)+1.5rem)] lg:block lg:h-fit lg:w-48"
    >
      <p className="kicker mb-s-3">On this page</p>
      <ul className="flex flex-col gap-1 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={clsx(
                "block border-l-2 py-1 pl-s-3 font-sans text-sm leading-snug transition-colors duration-fast ease-out",
                activeId === item.id
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
