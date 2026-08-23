"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

/**
 * GitHub-shaped nav: top-level headings that expand into a multi-column panel
 * of described links, beside plain links for destinations that need no
 * explaining.
 *
 * WHY THIS IS A DISCLOSURE, NOT A MENU. Radix's DropdownMenu was the obvious
 * reach (it is already vendored) but it applies `role="menu"` / `role="menuitem"`,
 * which tells a screen reader these are commands in an application menu. They
 * are not; they are ordinary navigation links, and under `role="menuitem"` a
 * screen reader stops announcing them as links and arrow keys hijack what
 * would otherwise be normal Tab traversal. The correct pattern for a nav
 * dropdown full of links is a button with `aria-expanded` controlling a region
 * of plain anchors, which is what this is. It is also why the panel is not
 * focus-trapped: Tab should walk out of it into the next nav item.
 *
 * Hover opens it on pointer devices, matching GitHub, but hover is never the
 * ONLY way in: the trigger is a real button, so click and Enter/Space work
 * identically, which is what keyboard and touch users actually get. The close
 * delay exists because the panel sits a few pixels below its trigger and
 * without it the menu vanishes while the pointer crosses that gap.
 */

export interface MegaItem {
  href: string;
  label: string;
  /** One line, and it has to be true. Rendered under the label. */
  description: string;
}

export interface MegaSection {
  /** Column heading inside the panel, set as a kicker. */
  title: string;
  items: readonly MegaItem[];
}

export interface NavMenuItem {
  label: string;
  /** A plain link when `href` is set, a mega panel when `sections` is. */
  href?: string;
  sections?: readonly MegaSection[];
}

/** How long the panel survives after the pointer leaves, in ms. */
const CLOSE_DELAY = 120;

/**
 * Does this device have a real hovering pointer?
 *
 * This decides what a CLICK on an already-open trigger means, and getting it
 * wrong makes the menu feel broken in a way that is easy to ship and hard to
 * notice. On a mouse, moving onto the trigger opens the panel; if click then
 * TOGGLED, the perfectly natural act of hovering and then clicking the thing
 * you are pointing at would shut it again the instant it appeared. So on
 * hover-capable devices a click only ever opens, and hover-out or Escape or a
 * click outside is what closes.
 *
 * On touch there is no hover, so nothing pre-opens the panel and click has to
 * be a real toggle or there would be no way to dismiss it.
 *
 * Read lazily inside an effect rather than at module scope: `matchMedia` does
 * not exist during SSR, and a device can change (a tablet gaining a mouse), so
 * the query is subscribed to rather than sampled once.
 */
function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHasHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return hasHover;
}

export function NavMenu({ items }: { items: readonly NavMenuItem[] }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenLabel(null), CLOSE_DELAY);
  }, [cancelClose]);

  // A navigation is the one close that must be immediate: the panel is
  // inside the sticky header, so a lingering one would sit over the page the
  // user just asked for.
  useEffect(() => {
    cancelClose();
    setOpenLabel(null);
  }, [pathname, cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Escape closes from anywhere inside, and a pointer press outside closes
  // too. `pointerdown` rather than `click` so the panel is gone before the
  // click lands on whatever is underneath it.
  useEffect(() => {
    if (!openLabel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenLabel(null);
      // Return focus to the trigger, or Escape would strand the caret in a
      // panel that no longer exists.
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`[data-nav-trigger="${CSS.escape(openLabel)}"]`)
        ?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenLabel(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openLabel]);

  return (
    <div
      ref={rootRef}
      className="hidden items-center gap-1 lg:flex"
      // Tabbing out of the last link in a panel should close it. `focusout`
      // bubbles (unlike `blur`), and relatedTarget tells us where focus went.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenLabel(null);
      }}
    >
      {items.map((item) =>
        item.sections ? (
          <MegaTrigger
            key={item.label}
            item={item}
            open={openLabel === item.label}
            onOpen={() => {
              cancelClose();
              setOpenLabel(item.label);
            }}
            onToggle={() => {
              cancelClose();
              setOpenLabel((cur) => (cur === item.label ? null : item.label));
            }}
            onActivate={() => {
              cancelClose();
              setOpenLabel(item.label);
            }}
            onScheduleClose={scheduleClose}
          />
        ) : (
          <Link
            key={item.label}
            href={item.href!}
            aria-current={pathname === item.href ? "page" : undefined}
            onMouseEnter={scheduleClose}
            className={clsx(
              "rounded-md px-s-3 py-s-2 font-sans text-sm transition-colors duration-fast ease-out",
              // Current-page state reads as a real accent signal now (was
              // plain text-ink, indistinguishable from "just less muted").
              // The mega-menu trigger's own open/closed state, just below in
              // this file, is deliberately left alone -- that's a different
              // state (is this dropdown expanded), not "current page", and
              // wasn't part of this change.
              pathname === item.href ? "text-accent-text" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ),
      )}
    </div>
  );
}

function MegaTrigger({
  item,
  open,
  onOpen,
  onToggle,
  onActivate,
  onScheduleClose,
}: {
  item: NavMenuItem;
  open: boolean;
  onOpen: () => void;
  /** Touch and keyboard: click means "flip it". */
  onToggle: () => void;
  /** Hovering pointer: click means "open it", never "close it". */
  onActivate: () => void;
  onScheduleClose: () => void;
}) {
  const panelId = useId();
  const hasHover = useHasHover();
  const sections = item.sections!;

  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onScheduleClose}>
      <button
        type="button"
        data-nav-trigger={item.label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={hasHover ? onActivate : onToggle}
        className={clsx(
          "inline-flex items-center gap-1 rounded-md px-s-3 py-s-2 font-sans text-sm transition-colors duration-fast ease-out",
          open ? "text-ink" : "text-ink-muted hover:text-ink",
        )}
      >
        {item.label}
        <ChevronDown
          aria-hidden
          className={clsx(
            "size-3.5 transition-transform duration-fast ease-out",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Kept mounted-on-open rather than hidden with CSS: an aria-hidden
          panel full of links is still in the tab order in some browsers, and
          a nav that traps Tab in invisible links is worse than one that
          animates less. */}
      {open && (
        <div
          id={panelId}
          className={clsx(
            "absolute left-0 top-full z-50 mt-s-2 w-max max-w-[min(46rem,calc(100vw-3rem))]",
            "rounded-xl border border-border bg-surface-raised p-s-5 shadow-e-3",
          )}
        >
          <div
            className={clsx(
              "grid gap-s-5",
              sections.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {sections.map((section) => (
              <div key={section.title} className="min-w-0">
                <p className="kicker">{section.title}</p>
                <ul className="mt-s-3 flex flex-col gap-s-1">
                  {section.items.map((entry) => (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        className="block rounded-md px-s-3 py-s-2 transition-colors duration-fast ease-out hover:bg-surface-sunken"
                      >
                        <span className="block font-sans text-sm font-medium text-ink">
                          {entry.label}
                        </span>
                        <span className="mt-[2px] block font-sans text-[13px] leading-snug text-ink-muted">
                          {entry.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
