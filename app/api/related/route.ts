// GET ?workspaceId=&paperId=. Calls lib/services/related.ts (Semantic Scholar Recommendations API, free, no key).
// Returns title/tl;dr/citationCount list for the Related Papers rail.
import { NextResponse } from "next/server";
import { fetchWorkspace } from "@/lib/services/workspace";
import { fetchRelatedPapers } from "@/lib/services/related";
import { requireWorkspaceExists } from "@/lib/services/workspaceAccess";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const paperId = searchParams.get("paperId");

  if (!workspaceId || !paperId) {
    return NextResponse.json({ error: "invalid_query", detail: "workspaceId and paperId are required" }, { status: 400 });
  }

  const notFound = await requireWorkspaceExists(workspaceId);
  if (notFound) return notFound;

  const workspace = await fetchWorkspace(workspaceId);
  const paper = workspace.papers.find((p) => p.id === paperId);
  if (!paper) {
    return NextResponse.json({ error: "not_found", detail: `no paper ${paperId} in workspace ${workspaceId}` }, { status: 404 });
  }

  const result = await fetchRelatedPapers(paper.title);
  return NextResponse.json(result);
}
