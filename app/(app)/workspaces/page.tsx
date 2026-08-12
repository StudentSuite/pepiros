import Link from "next/link";
import { Plus } from "lucide-react";
import { mockWorkspaces } from "@/lib/mock/workspaces";
import { Logo } from "@/components/ui/Logo";
import { Panel } from "@/components/ui/Panel";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";

/**
 * `/workspaces` -- authenticated-only, `app/(app)/` has no shared layout
 * (unlike `(marketing)`/`(platform)`), so this page rolls its own minimal
 * top bar the same way `/w/[workspaceId]` and `/upload` do. Reads
 * `lib/mock/workspaces.ts` directly (server component, no fetch needed).
 */
export default function WorkspacesPage() {
  const workspaces = mockWorkspaces;

  return (
    <main className="min-h-screen bg-surface px-6 pb-24 pt-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Logo />

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-ink">Workspaces</h1>
            <p className="mt-1 font-sans text-sm text-ink-muted">
              Pick up a reading graph, or start a new one.
            </p>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <p className="font-sans text-sm text-ink-muted">
              No workspaces yet. Upload a paper to start your first one.
            </p>
            <Link href="/upload" className={buttonClassName("primary")}>
              <Icon icon={Plus} size="xs" className="mr-1.5" />
              New workspace
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link key={workspace.id} href={`/w/${workspace.id}`}>
                <Panel
                  padded
                  className="flex h-full flex-col gap-2 transition duration-fast ease-out hover:border-accent"
                >
                  <h2 className="font-serif text-lg text-ink">{workspace.name}</h2>
                  <p className="font-mono text-xs text-ink-faint">
                    {workspace.paperCount} {workspace.paperCount === 1 ? "paper" : "papers"} &middot; opened{" "}
                    {workspace.lastOpened}
                  </p>
                </Panel>
              </Link>
            ))}

            <Link href="/upload">
              <div className="flex h-full min-h-[104px] flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-border-strong text-ink-faint transition duration-fast ease-out hover:border-accent hover:text-ink-muted">
                <Icon icon={Plus} size="md" />
                <span className="font-sans text-sm">New workspace</span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
