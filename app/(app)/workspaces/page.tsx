import Link from "next/link";
import { Plus } from "lucide-react";
import { listWorkspaces } from "@/lib/services/workspaces";
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
 * built, plus the fixture. It's not yet scoped to the signed-in account
 * specifically: types/anchor.ts's Workspace has no ownerId field, and
 * there's no web-facing "create a workspace" route to attach one to in the
 * first place (the only creator today is MCP's create_workspace tool) --
 * the same gap #75's DangerZone fix and #78's own doc comment both already
 * flag as follow-up work once workspaces have a real owner to scope by.
 * Showing every real workspace instead of a hardcoded fake one is still
 * strictly more honest than what was here before.
 */
export default async function WorkspacesPage() {
  const workspaces = await listWorkspaces();

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
