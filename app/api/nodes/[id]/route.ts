import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteNode, getNode, updateNodeBody } from "@/lib/services/nodes";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";

/** ?workspaceId=... -- the same query-param convention app/api/related/route.ts already uses for a GET that needs one. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "invalid_query", detail: "workspaceId is required" }, { status: 400 });
  }

  const node = await getNode(workspaceId, id);
  if (!node) {
    return NextResponse.json({ error: "not_found", detail: `node ${id} does not exist in workspace ${workspaceId}` }, { status: 404 });
  }
  return NextResponse.json({ node });
}

const patchBodySchema = z.object({
  workspaceId: z.string().min(1),
  bodyMd: z.string(),
});

/**
 * Persists NodeEditor's Save button (components/inspector/NodeInspector.tsx)
 * -- previously a stub, so a user's edit vanished silently on Save with no
 * indication it hadn't gone anywhere (impeccable critique, 2026-08-16, P0).
 * Returns both `node` and `evidence`: updateNodeBody() re-verifies every
 * evidence row against the edited text and may downgrade/strip a citation
 * (issue #77), so the client applies the server's response rather than its
 * own optimistic copy of what it sent.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.message }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(parsed.data.workspaceId);
  if (denial) return denial;

  try {
    const { node, evidence } = await updateNodeBody({ workspaceId: parsed.data.workspaceId, nodeId: id, bodyMd: parsed.data.bodyMd });
    return NextResponse.json({ node, evidence });
  } catch (err) {
    return NextResponse.json(
      { error: "not_found", detail: err instanceof Error ? err.message : String(err) },
      { status: 404 },
    );
  }
}

/** ?workspaceId=... -- same convention as GET above. See lib/services/nodes.ts's deleteNode() for the cascade/stale-marking contract. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "invalid_query", detail: "workspaceId is required" }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(workspaceId);
  if (denial) return denial;

  try {
    const result = await deleteNode({ workspaceId, nodeId: id });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "not_found", detail: err instanceof Error ? err.message : String(err) },
      { status: 404 },
    );
  }
}
