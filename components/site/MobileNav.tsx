"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/data/types";

/**
 * Mobile navigation, following the pattern used on the portfolio site: a
 * full-screen panel that slides in from the right, with the links set large and
 * vertically centred, rather than a narrow side sheet.
 *
 * The header's link row is `hidden lg:flex` (raised from `sm` -- the full row
 * wrapped mid-word between 640-1023px, so tablet needs the sheet too, not
 * just phone widths). Below that breakpoint there is no other navigation:
 * How it works, For agents, Discover and About are unreachable except
 * through the footer.
 *
 * Three things that make this behave like a real dialog rather than a
 * decorative overlay, all carried over from that pattern:
 *
 *   - BODY SCROLL LOCK, so the page behind does not move under the panel.
 *   - FOCUS TRAP, so Tab cycles within the panel instead of walking into the
 *     page behind it, and focus returns to the trigger on close.
 *   - ESCAPE to close, which people expect from anything modal.
 *
 * One deliberate difference from the portfolio: the motion is ease-out, not a
 * spring. design/DIRECTIONS.md rules out spring easing for this project, so the
 * behaviour matches while the curve stays on-brand.
 *
 * THE PANEL IS PORTALLED, and it has to be. This component renders inside the
 * site header, which carries `backdrop-filter` for its glass effect. A filter
 * (backdrop or otherwise) establishes a CONTAINING BLOCK for fixed-position
 * descendants, so `fixed inset-0` inside it resolves against the header's own
 * 52px-tall box rather than the viewport: the overlay rendered as a thin strip
 * across the top. Portalling to <body> escapes that.
 */
export function MobileNav({
  links,
  secondaryLinks,
  session,
}: {
  links: ReadonlyArray<{ href: string; label: string }>;
  /** Issue #121: pages otherwise reachable only via a footer scroll below
   *  the `lg` breakpoint the primary nav row is hidden under -- shown as a
   *  smaller, secondary list so the sheet still reads primary-links-first. */
  secondaryLinks?: ReadonlyArray<{ href: string; label: string }>;
  session?: Profile | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();

  // createPortal needs a real document, which does not exist during SSR.
  useEffect(() => setMounted(true), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Close on navigation. Next reuses the tree across a client-side route
  // change, so without this the panel stays open over the page just opened.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-9 place-items-center rounded-md text-ink-muted transition-colors duration-fast ease-out hover:text-ink lg:hidden"
      >
        {open ? (
          <X className="size-5" strokeWidth={1.5} />
        ) : (
          <Menu className="size-5" strokeWidth={1.5} />
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: reduced ? 0 : 0.28,
              ease: [0.16, 1, 0.3, 1], // --ease-out
            }}
            className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-surface lg:hidden"
          >
            {/* Quiet pillar wash, so the panel reads as a surface of its own
                rather than a flat block of --surface. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16]"
              style={{
                background:
                  "radial-gradient(circle at 20% 12%, var(--pillar-4) 0%, transparent 45%), " +
                  "radial-gradient(circle at 85% 30%, var(--pillar-7) 0%, transparent 42%)",
              }}
            />

            <div className="flex h-topbar items-center justify-between px-s-4">
              <Link href="/" onClick={close} aria-label="Pepiros home">
                <Logo />
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-md text-ink-muted transition-colors duration-fast ease-out hover:text-ink"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col justify-center gap-s-2 px-s-5">
              {links.map((link, i) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "py-s-2 font-sans font-semibold text-3xl leading-tight transition-colors duration-fast ease-out",
                      active ? "text-accent-text" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {secondaryLinks && secondaryLinks.length > 0 && (
              <nav
                aria-label="More pages"
                className="flex flex-wrap gap-x-s-4 gap-y-s-2 border-t border-border px-s-5 py-s-4"
              >
                {secondaryLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "font-sans text-sm transition-colors duration-fast ease-out",
                        active ? "text-accent-text" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="flex flex-col gap-s-3 border-t border-border px-s-5 py-s-6">
              {session ? (
                <>
                  <Link
                    href={`/u/${session.username}`}
                    onClick={close}
                    className={buttonClassName("secondary")}
                  >
                    Your profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={close}
                    className={buttonClassName("ghost")}
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={close}
                    className={buttonClassName("primary")}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/discover"
                    onClick={close}
                    className={buttonClassName("secondary")}
                  >
                    Browse the library
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
