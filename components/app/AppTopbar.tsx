"use client";

import clsx from "clsx";
import { SidebarTrigger } from "@/components/shadcn/sidebar";
import { Separator } from "@/components/shadcn/separator";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useIsOffline } from "@/hooks/useIsOffline";

/**
 * Issue #372: components/ui/OfflineBanner.tsx docks `fixed inset-x-0 top-0
 * z-[70]`, above this header's own z-30, and doesn't expose its visibility
 * to consumers -- without tracking online/offline state itself, this header
 * rendered underneath the banner instead of below it, same bug
 * components/site/SiteHeader.tsx already had a fix for (`top-7` while
 * offline). A separate client component because AppLayout itself is a
 * server component (it awaits getSession()/getAdapter() before rendering)
 * and useIsOffline needs the browser's online/offline events.
 */
export function AppTopbar() {
  const offline = useIsOffline();

  return (
    <header
      className={clsx(
        "sticky z-30 flex h-topbar shrink-0 items-center gap-s-2 border-b border-border bg-[var(--glass-bg)] px-s-4 backdrop-blur-[var(--glass-blur)] backdrop-saturate-150",
        "transition-[top] duration-fast ease-out",
        offline ? "top-7" : "top-0",
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}
