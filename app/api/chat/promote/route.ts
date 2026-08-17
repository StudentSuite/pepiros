// POST. Promotes a chat answer that draws on more than one paper into a
// cross-paper ThreadNode -- see lib/services/nodes.ts's promoteToThread()
// for the actual derived_from/relates edge logic. Distinct from POST
// /api/nodes (components/chat/PromoteButton.tsx's single-paper leaf promote),
// which isn't shaped for a node spanning multiple papers.
import { NextResponse } from "next/server";
import { z } from "zod";
import { promoteToThread } from "@/lib/services/nodes";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  bodyMd: z.string(),
  claims: z.array(z.object({ refs: z.array(z.string()).min(1), quote: z.string() })),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(parsed.data.workspaceId);
  if (denial) return denial;

  try {
    const result = await promoteToThread(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "promote_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
