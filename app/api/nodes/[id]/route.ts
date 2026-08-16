// TODO: GET|DELETE single node. DELETE cascades per PLAN-V1.md §4.6 invariant 4.
import { NextResponse } from "next/server";
import { z } from "zod";
import { notImplemented } from "@/lib/api/notImplemented";
import { updateNodeBody } from "@/lib/services/nodes";

export async function GET() {
  return notImplemented("GET /api/nodes/[id]");
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
