// GET ?workspaceId=&paperId=&direction=cites|cited_by. Calls lib/services/citationExpand.ts (OpenAlex API, free, no
// key). Returns ghost-node candidates for canvas-edge expansion.
//
// Issue #93: there used to be a POST handler here too, permanently 501ing
// via lib/api/notImplemented.ts -- but components/canvas/GhostCitationNode.tsx's
// "Add to workspace" button doesn't call it at all; it POSTs a candidate's
// pdfUrl straight to POST /api/ingest's URL-ingest path, which is the real
// pipeline (scripts/parse.py exists now). The dead 501 handler was
// unreachable orphaned code, not a live dead end -- removed rather than
// implemented, since there was nothing left calling it to fix.
import { NextResponse } from "next/server";
import { fetchWorkspace } from "@/lib/services/workspace";
import { fetchCitationExpansion, type CitationDirection } from "@/lib/services/citationExpand";
import { requireWorkspaceExists } from "@/lib/services/workspaceAccess";

function isDirection(value: string | null): value is CitationDirection {
  return value === "cites" || value === "cited_by";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const paperId = searchParams.get("paperId");
  const direction = searchParams.get("direction");

  if (!workspaceId || !paperId || !isDirection(direction)) {
    return NextResponse.json(
      { error: "invalid_query", detail: "workspaceId, paperId, and direction (cites|cited_by) are required" },
      { status: 400 },
    );
  }

  const notFound = await requireWorkspaceExists(workspaceId);
  if (notFound) return notFound;

  const workspace = await fetchWorkspace(workspaceId);
  const paper = workspace.papers.find((p) => p.id === paperId);
  if (!paper) {
    return NextResponse.json({ error: "not_found", detail: `no paper ${paperId} in workspace ${workspaceId}` }, { status: 404 });
  }

  const result = await fetchCitationExpansion(paper.title, direction);
  return NextResponse.json(result);
}
