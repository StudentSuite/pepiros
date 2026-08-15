// GET ?workspaceId=...&format=md|bibtex. Workspace export with footnote
// citations (md) or a verbatim quote appendix (bibtex). Calls
// lib/services/export.ts only, per CLAUDE.md's service-layer boundary.
import { NextResponse } from "next/server";
import { exportWorkspaceBibtex, exportWorkspaceMarkdown } from "@/lib/services/export";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const format = url.searchParams.get("format") ?? "md";

  if (!workspaceId) {
    return NextResponse.json({ error: "invalid_query", detail: "workspaceId is required." }, { status: 400 });
  }
  if (format !== "md" && format !== "bibtex") {
    return NextResponse.json({ error: "invalid_query", detail: 'format must be "md" or "bibtex".' }, { status: 400 });
  }

  const content = format === "md" ? await exportWorkspaceMarkdown(workspaceId) : await exportWorkspaceBibtex(workspaceId);
  const extension = format === "md" ? "md" : "bib";

  return new NextResponse(content, {
    headers: {
      "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "text/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${workspaceId}.${extension}"`,
    },
  });
}
