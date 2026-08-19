import { GraphCanvas } from "@/components/canvas/GraphCanvas";
import { ReaderTabsNav } from "@/components/reader/ReaderTabsNav";
import { getSession } from "@/lib/auth/session";
import { GuestBanner } from "@/components/auth/GuestBanner";

/**
 * Standalone canvas route (plan.md: reached via the reader view's "Explore graph"
 * toggle, but must also work when navigated to directly, e.g. /w/ws-1/canvas).
 * React Flow requires an explicitly sized parent, so the canvas takes the
 * remaining height under the bar rather than `h-dvh` on the whole page.
 *
 * The bar exists because this route has no layout of its own: previously the
 * canvas filled the viewport with no title and no way back, so the only exit
 * was the browser's back button -- and a reader who arrived by link had none.
 */
export default async function CanvasPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();

  return (
    <div className="flex h-dvh w-full flex-col bg-surface">
      {!session && <GuestBanner next={`/w/${workspaceId}/canvas`} />}

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-s-3 border-b border-border px-s-5 py-s-3">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Graph
        </h1>
        <ReaderTabsNav workspaceId={workspaceId} active="canvas" />
      </header>

      <div id="main-content" className="relative min-h-0 flex-1">
        <GraphCanvas workspaceId={workspaceId} />
      </div>
    </div>
  );
}
