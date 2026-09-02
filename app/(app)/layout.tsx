import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/shadcn/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";

/**
 * The signed-in shell.
 *
 * This did not exist before: /workspaces, /settings, /w and /s each hand-rolled
 * their own top bar and Logo placement, which is why four surfaces had drifted
 * into four slightly different chromes. They now share one.
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
      {/* min-w-0 is load-bearing. A flex item defaults to min-width:auto, so
          without it this refuses to shrink below its content's intrinsic width.
          Once the sidebar claims 256px at the md breakpoint, wide content (the
          posts table, the token form) pushed the document past the viewport and
          produced a horizontal page scrollbar. */}
      <SidebarInset className="min-w-0">
        {/* Top bar is reserved for page-level actions; each page renders its
            own into the slot below the divider. This bar carries only the
            things that belong to the shell. */}
        <AppTopbar />

        <main id="main-content" className="min-w-0 flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
