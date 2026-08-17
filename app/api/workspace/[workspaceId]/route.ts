// GET. Returns the full Workspace (papers, chunks, numerics, nodes, edges,
// evidence) for the client store to hydrate from. Reads through
// lib/services/workspace.ts's fetchWorkspace() only, per CLAUDE.md's
// service-layer boundary -- the same seam every other server-side reader
// (MCP tools, the other app/api/* routes) goes through.
//
// This exists because lib/store/workspace.ts's loadWorkspace() used to call
// fetchWorkspace() directly from client code. That worked back when
// fetchWorkspace() only ever read the static fixture (safe to bundle into
// client JS), but broke two ways once it also had to check
// lib/services/ingestStore.ts for a real ingested workspace: that module's
// `import "server-only"` fails the production client bundle outright, and
// even routed around, the in-memory ingest store the server populates is
// server-process memory a browser bundle can never actually reach -- a
// newly ingested paper would silently never appear in the reader UI, only
// in direct API responses. Routing the client through this endpoint instead
// means every reader of a workspace, browser included, goes through the one
// real seam.
import { NextResponse } from "next/server";
import { fetchWorkspace } from "@/lib/services/workspace";
import { requireWorkspaceExists } from "@/lib/services/workspaceAccess";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const notFound = await requireWorkspaceExists(workspaceId);
  if (notFound) return notFound;

  const workspace = await fetchWorkspace(workspaceId);
  return NextResponse.json(workspace);
}
