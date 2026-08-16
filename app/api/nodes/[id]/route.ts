// TODO: DELETE single node. Cascades per PLAN-V1.md §4.6 invariant 4.
import { NextResponse } from "next/server";
import { z } from "zod";
import { notImplemented } from "@/lib/api/notImplemented";
import { getNode, updateNodeBody } from "@/lib/services/nodes";

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
 * No node_versions row yet -- see lib/services/nodes.ts's updateNodeBody doc
 * comment for why that's still out of scope.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.message }, { status: 400 });
  }

  try {
    const node = await updateNodeBody({ workspaceId: parsed.data.workspaceId, nodeId: id, bodyMd: parsed.data.bodyMd });
    return NextResponse.json({ node });
  } catch (err) {
    return NextResponse.json(
      { error: "not_found", detail: err instanceof Error ? err.message : String(err) },
      { status: 404 },
    );
  }
}

export async function DELETE() {
  return notImplemented("DELETE /api/nodes/[id]");
}
