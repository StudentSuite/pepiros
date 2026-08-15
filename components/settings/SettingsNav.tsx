"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, KeyRound, Plug, TriangleAlert, User } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/security", label: "Security", icon: KeyRound },
  { href: "/settings/mcp-tokens", label: "MCP tokens", icon: Plug },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/danger", label: "Danger zone", icon: TriangleAlert },
] as const;

/** Section nav for the settings shell. Horizontal on mobile, a rail above md. */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="flex shrink-0 gap-s-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible"
    >
      {SECTIONS.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-s-2 rounded-md px-s-3 py-s-2 font-sans text-sm transition-colors duration-fast ease-out",
              active
                ? "bg-accent-wash text-accent-text"
                : "text-ink-muted hover:bg-subtle hover:text-ink",
              // the destructive section reads as destructive even when idle
              s.href === "/settings/danger" && !active && "text-pillar-text-5",
            )}
          >
            <s.icon className="size-4" strokeWidth={1.5} />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
