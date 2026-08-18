// POST. Creates a node from a set of claims (docs/PLAN-V1.md §13.2's
// create_node contract), the HTTP twin of the MCP create_node tool. Calls
// lib/services/nodes.ts only, per the service-layer boundary in CLAUDE.md --
// this is what lets chat's Promote button and the MCP tool share one
// re-verification path instead of two that could drift.
import { NextResponse } from "next/server";
import { z } from "zod";
import { createNode } from "@/lib/services/nodes";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";
import { UserFacingError } from "@/lib/errors";

const bodySchema = z.object({
  workspaceId: z.string(),
  parentId: z.string().optional(),
  title: z.string().min(1),
  bodyMd: z.string(),
  claims: z.array(z.object({ refs: z.array(z.string()).min(1), quote: z.string() })),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(parsed.data.workspaceId);
  if (denial) return denial;

  try {
    const result = await createNode(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: "create_node_failed", detail: err.message }, { status: 400 });
    }
    // Issue #107: an unanticipated error (not one of nodes.ts's own
    // hand-authored UserFacingErrors) must not reach the client verbatim --
    // same guard ingestStore.ts's guardedWrite() already applies to DB
    // errors, widened here to anything this route can throw.
    console.error("[api/nodes] create_node failed:", err);
    return NextResponse.json(
      { error: "create_node_failed", detail: "Could not create this node right now. Try again." },
      { status: 500 },
    );
  }
}
