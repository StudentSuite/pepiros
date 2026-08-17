// GET ?workspaceId=... Serves the real ingested PDF binary for
// components/reader/PdfPane.tsx's react-pdf viewer (issue #76). Calls
// lib/services/ingest.ts's getPaperPdfBytes() only, per CLAUDE.md's
// service-layer boundary. No auth check: this is a read, same as the other
// guest-accessible workspace reads (workspace/graph/export) middleware.ts
// documents as intentionally open.
import { NextResponse } from "next/server";
import { getPaperPdfBytes } from "@/lib/services/ingest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paperId: string }> },
) {
  const { paperId } = await params;
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "invalid_query", detail: "workspaceId is required" }, { status: 400 });
  }

  const bytes = await getPaperPdfBytes(workspaceId, paperId);
  if (!bytes) {
    return NextResponse.json(
      {
        error: "not_found",
        detail: `No stored PDF for paper ${paperId} in workspace ${workspaceId} -- either it hasn't been ingested locally, or it's a fixture/demo paper with no real file.`,
      },
      { status: 404 },
    );
  }

  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf" } });
}
