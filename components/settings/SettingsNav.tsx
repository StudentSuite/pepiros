"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/mcp-tokens", label: "MCP tokens" },
  { href: "/settings/notifications", label: "Notifications" },
] as const;

const DANGER = { href: "/settings/danger", label: "Danger zone" } as const;

/**
 * Section nav.
 *
 * Text-only, no icons and no filled pills. The icon-per-row version competed
 * with the page content for attention on what is a secondary navigation
 * surface; an active marker plus weight is enough to say where you are.
 *
 * Scrolls horizontally below md, where a vertical rail would eat a third of a
 * phone screen.
 */
export function SettingsNav({ showDanger = true }: { showDanger?: boolean }) {
  const pathname = usePathname();
  const items = showDanger ? [...SECTIONS, DANGER] : SECTIONS;

  return (
    <nav
      aria-label="Settings sections"
      className="-mx-6 flex shrink-0 gap-s-1 overflow-x-auto px-6 pb-s-2 md:mx-0 md:w-44 md:flex-col md:overflow-visible md:px-0 md:pb-0"
    >
      {items.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 whitespace-nowrap rounded-md px-s-3 py-s-2 font-sans text-sm transition-colors duration-fast ease-out",
              active
                ? "font-medium text-ink md:bg-subtle"
                : "text-ink-faint hover:text-ink",
              s.href === DANGER.href && !active && "text-pillar-text-5/80",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
