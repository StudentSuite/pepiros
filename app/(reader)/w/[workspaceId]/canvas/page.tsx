import { GraphCanvas } from "@/components/canvas/GraphCanvas";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
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
 *
 * Issue #293: that bar used to be a bare <h1>Graph</h1>, with no breadcrumb,
 * paper title, or way to reach the papers/nodes list short of the browser
 * back button -- drift from the reader shell that #90 already fixed for
 * Audit/Outline/Learn. CanvasHeader restores the reader's exact breadcrumb
 * plus a sheet-based papers/nodes list.
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

      <CanvasHeader workspaceId={workspaceId} isGuest={!session} />

      <div id="main-content" className="relative min-h-0 flex-1">
        <GraphCanvas workspaceId={workspaceId} />
      </div>
    </div>
  );
}
