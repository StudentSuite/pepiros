// GET. Returns nodes + edges for the canvas. Reads through lib/services/workspace.ts's fetchWorkspace() -- no live DB
// yet, so this always resolves the fixture regardless of workspaceId (same seam noted in app/api/verify/route.ts).
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
