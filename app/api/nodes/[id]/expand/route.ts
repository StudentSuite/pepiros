// POST. Answers one followup question for a node (docs/PLAN-V1.md §9.3:
// followup chips call this), generating and verifying a new child leaf node
// via lib/services/nodes.ts's expandNode() -- the only thing this route
// does is validate the body and shape the response, per CLAUDE.md's
// service-layer boundary.
import { NextResponse } from "next/server";
import { z } from "zod";
import { expandNode } from "@/lib/services/nodes";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";
import { UserFacingError } from "@/lib/errors";

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
    // Issue #266: any err.message used to reach the client verbatim.
    // Matches app/api/nodes/route.ts's established pattern (issue #107).
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: "expand_failed", detail: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    if (isConfig) {
      return NextResponse.json({ error: "model_not_configured", detail: message }, { status: 503 });
    }
    console.error("[api/nodes/[id]/expand] expandNode failed:", err);
    return NextResponse.json(
      { error: "expand_failed", detail: "Could not answer that follow-up right now. Try again." },
      { status: 500 },
    );
  }
}
