import { GraphCanvas } from "@/components/canvas/GraphCanvas";

/**
 * Standalone canvas route (plan.md: reached via the reader view's "Explore graph"
 * toggle, but must also work when navigated to directly, e.g. /w/ws-1/canvas).
 * React Flow requires an explicitly sized parent -- `h-dvh` gives it a real height
 * independent of whatever chrome the reader view would otherwise wrap it in.
 */
export default async function CanvasPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="h-dvh w-full bg-surface">
      <GraphCanvas workspaceId={workspaceId} />
    </div>
  );
}
