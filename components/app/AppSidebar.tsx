"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronsUpDown,
  Compass,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Plug,
  Settings,
  TrendingUp,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import type { Profile } from "@/lib/data/types";

/**
 * The product's spine.
 *
 * Structure follows the dashboard brief deliberately:
 *   - profile sits at the TOP with a chevron, so the account is the first
 *     thing found and is visibly a menu rather than a label
 *   - every link carries an icon plus a short title, no icon-only guessing
 *   - links are grouped by relevance, and the two that get used least
 *     (Settings, Help) are pinned to the absolute bottom rather than mixed in
 *   - the active route gets a filled rectangle, not just a colour change,
 *     because colour alone is not a strong enough signal at this density
 *   - unread comments surface as a count chip, which is the one place empty
 *     rail space earns its keep
 */

const READING = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workspaces", label: "Library", icon: BookOpen },
  { href: "/discover", label: "Discover", icon: Compass },
] as const;

const CREATOR = [
  { href: "/posts", label: "My posts", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/comments", label: "Comments", icon: MessageSquare, badgeKey: "comments" },
] as const;

const CONNECT = [{ href: "/settings/mcp-tokens", label: "MCP tokens", icon: Plug }] as const;

const BOTTOM = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/docs", label: "Help", icon: HelpCircle },
] as const;

export function AppSidebar({
  profile,
  unreadComments = 0,
}: {
  profile: Profile;
  unreadComments?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // `/settings` must not light up while `/settings/mcp-tokens` is active, so an
  // exact match wins and prefix matching is only used for genuine subtrees.
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/settings") return false;
    return pathname.startsWith(`${href}/`);
  };

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-accent font-mono text-xs text-white">
                      {profile.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-sans text-sm font-medium">
                      {profile.displayName}
                    </span>
                    <span className="truncate font-mono text-[11px] text-ink-faint">
                      @{profile.username}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={`/u/${profile.username}`}>
                    <User className="size-4" />
                    Public profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">
                    <Settings className="size-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Reading</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {READING.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Creator</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CREATOR.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {"badgeKey" in item && unreadComments > 0 && (
                    <SidebarMenuBadge>{unreadComments}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Connect</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CONNECT.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Least-used links, pinned to the bottom rather than mixed into the
          groups above. */}
      <SidebarFooter>
        <SidebarMenu>
          {BOTTOM.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {/* Back to the public site. The wordmark's brand tracking (0.29em) is
              too wide for the rail, so this uses plain mono type rather than
              the Logo lockup, which clipped at the sidebar edge. */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Pepiros home" size="sm">
              <Link href="/">
                <Home className="opacity-60" />
                <span className="font-mono text-[11px] text-ink-faint">
                  pepiros.dev
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
