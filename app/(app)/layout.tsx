import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/shadcn/sidebar";
import { Separator } from "@/components/shadcn/separator";
import { Toaster } from "@/components/shadcn/sonner";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";

/**
 * The signed-in shell.
 *
 * This did not exist before: /workspaces, /welcome, /settings, /w and /s each
 * hand-rolled their own top bar and Logo placement, which is why five surfaces
 * had drifted into five slightly different chromes. They now share one.
 *
 * The reader (/w) and share view (/s) are NOT under this layout -- they moved
 * to the (reader) route group, because they want the full viewport and their
 * own workspace-scoped rail rather than the product-level one. URLs are
 * unchanged; route groups do not appear in the path.
 *
 * Auth is enforced by middleware.ts before this renders. The redirect here is
 * belt-and-braces for the case where the matcher and this tree drift apart.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const comments = await getAdapter().listComments(profile.id);
  const unread = comments.filter((c) => !c.read).length;

  return (
    <SidebarProvider>
      <AppSidebar profile={profile} unreadComments={unread} />
      <SidebarInset>
        {/* Top bar is reserved for page-level actions; each page renders its
            own into the slot below the divider. This bar carries only the
            things that belong to the shell. */}
        <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-s-2 border-b border-border bg-[var(--glass-bg)] px-s-4 backdrop-blur-[var(--glass-blur)] backdrop-saturate-150">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </SidebarInset>

      {/* Sonner, scoped to the signed-in shell. The pre-existing
          components/ui/Toaster in the root layout still serves the marketing
          and platform routes; the two do not overlap because no route renders
          both trees. */}
      <Toaster />
    </SidebarProvider>
  );
}
