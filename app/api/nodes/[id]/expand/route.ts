// POST. Answers one followup question for a node (docs/PLAN-V1.md §9.3:
// followup chips call this), generating and verifying a new child leaf node
// via lib/services/nodes.ts's expandNode() -- the only thing this route
// does is validate the body and shape the response, per CLAUDE.md's
// service-layer boundary.
import { NextResponse } from "next/server";
import { z } from "zod";
import { expandNode } from "@/lib/services/nodes";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  question: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(parsed.data.workspaceId);
  if (denial) return denial;

  try {
    const result = await expandNode({ workspaceId: parsed.data.workspaceId, nodeId: id, question: parsed.data.question });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    return NextResponse.json(
      { error: isConfig ? "model_not_configured" : "expand_failed", detail: message },
      { status: isConfig ? 503 : 400 },
    );
  }
}
