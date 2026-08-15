// GET. Returns nodes + edges for the canvas. Reads through
// lib/services/workspace.ts's fetchWorkspace(), which already applies the
// deterministic server-side layout from lib/layout (docs/PLAN-V1.md §9.1), so
// this route does not lay out anything itself -- doing so would recompute what
// the seam already did.
//
// fetchWorkspace resolves a workspaceId that real ingest has actually built
// (lib/services/ingest.ts) or falls back to the fixture otherwise -- see that
// function's own doc comment.
import { NextResponse } from "next/server";
import { fetchWorkspace } from "@/lib/services/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const workspace = await fetchWorkspace(workspaceId);
  return NextResponse.json({ nodes: workspace.nodes, edges: workspace.edges });
}
