"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet";
import { Button } from "@/components/shadcn/button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import type { MockUser } from "@/lib/mock/session";

/**
 * Mobile navigation.
 *
 * The header's link row is `hidden sm:flex`, which meant that below 640px the
 * primary navigation simply did not exist: How it works, For agents, Discover
 * and About were unreachable except through the footer. This restores them.
 *
 * A sheet rather than a dropdown, because the list carries auth actions and
 * secondary links as well, and a panel gives them room to be tap-sized.
 */
export function MobileNav({
  links,
  session,
}: {
  links: ReadonlyArray<{ href: string; label: string }>;
  session?: { user: MockUser } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Closing on navigation is not automatic: Next reuses the same tree across a
  // client-side route change, so without this the panel stays open over the
  // page you just moved to.
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="sm:hidden"
        >
          <Menu className="size-5" strokeWidth={1.5} />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[min(20rem,85vw)]">
        <SheetHeader className="text-left">
          <SheetTitle asChild>
            <Link href="/" onClick={close}>
              <Logo size="md" />
            </Link>
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-s-6 flex flex-col">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b border-border py-s-4 font-serif text-lg transition-colors duration-fast ease-out",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-s-6 flex flex-col gap-s-3">
          {session ? (
            <>
              <Button asChild variant="outline" onClick={close}>
                <Link href={`/u/${session.user.username}`}>Your profile</Link>
              </Button>
              <Button asChild variant="ghost" onClick={close}>
                <Link href="/settings">Settings</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild onClick={close}>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" onClick={close}>
                <Link href="/discover">Browse the library</Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
