import Link from "next/link";
import { Plus } from "lucide-react";
import { listWorkspaces } from "@/lib/services/workspaces";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * `/workspaces` -- middleware.ts already protects this route (redirects a
 * signed-out visitor to /login before this ever renders), and app/(app)/
 * layout.tsx already wraps every page here with AppSidebar, so this needs
 * no session check or top-bar chrome of its own.
 *
 * Issue #91: this used to read lib/mock/workspaces.ts's hardcoded single
 * `ws-1` entry regardless of what actually exists, the one page in this
 * route group that never reflected real state. lib/services/workspaces.ts's
 * listWorkspaces() (already built for the MCP list_workspaces tool) is the
 * real thing to read instead -- every workspace real ingest has actually
 * built, plus the fixture.
 *
 * Issue #231: scoped to the signed-in account. This page used to list every
 * workspace on the deployment, because workspaces had no owner to filter on.
 * They do now (supabase/migrations/0006_workspace_owner.sql), so the listing
 * is the session's own. The demo fixture is still included: it is
 * deliberately public and is the workspace a guest is invited into, so it is
 * not somebody's private property to scope.
 *
 * middleware.ts guarantees a session before this renders, so getSession()
 * cannot be null here; the fallback exists so a future routing change
 * degrades to "your own workspaces, and none if we can't tell who you are"
 * rather than to "everybody's".
 */
export default async function WorkspacesPage() {
  const session = await getSession();
  // Explicitly branched rather than passing a falsy id: listWorkspaces()
  // treats a missing ownerId as "unscoped, return everything", so `?? ""`
  // here would quietly restore the exact bug this is fixing.
  const workspaces = session ? await listWorkspaces(session.id) : [];

  return (
    <div className="mx-auto w-full max-w-6xl p-s-5">
      <PageHeader
        title="Workspaces"
        description="Pick up a reading graph, or start a new one."
        primaryAction={{ label: "New workspace", href: "/upload" }}
      />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No workspaces yet."
          description="Upload a paper to start your first one."
          action={{ label: "New workspace", href: "/upload" }}
        />
      ) : (
        <div className="mt-s-6 grid grid-cols-1 gap-s-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/w/${workspace.id}`}>
              <Panel
                padded
                className="flex h-full flex-col gap-s-2 transition duration-fast ease-out hover:border-accent"
              >
                <h2 className="font-serif text-lg text-ink">{workspace.name}</h2>
                <p className="font-mono text-xs text-ink-faint">
                  {workspace.paperCount} {workspace.paperCount === 1 ? "paper" : "papers"}
                </p>
              </Panel>
            </Link>
          ))}

          <Link
            href="/upload"
            className="flex min-h-full flex-col items-center justify-center gap-s-2 rounded border-2 border-dashed border-border-strong p-s-5 text-ink-faint transition duration-fast ease-out hover:border-accent hover:text-ink-muted"
          >
            <Icon icon={Plus} size="md" />
            <span className="font-sans text-sm">New workspace</span>
          </Link>
        </div>
      )}
    </div>
  );
}
