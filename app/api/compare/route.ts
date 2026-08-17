// POST. Cross-paper synthesis (docs/PLAN-V1.md §10): pairwise comparison
// over every pair of papers in a workspace, writing real agrees/contradicts/
// extends/shares_method/relates edges (each backed by two-sided verified
// evidence) plus Consensus/Contradictions synthesis nodes. Calls
// lib/services/synthesis.ts only, per CLAUDE.md's service-layer boundary.
import { NextResponse } from "next/server";
import { z } from "zod";
import { runSynthesis } from "@/lib/services/synthesis";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";

const bodySchema = z.object({ workspaceId: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(parsed.data.workspaceId);
  if (denial) return denial;

  try {
    const result = await runSynthesis(parsed.data.workspaceId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    return NextResponse.json(
      { error: isConfig ? "model_not_configured" : "synthesis_failed", detail: message },
      { status: isConfig ? 503 : 500 },
    );
  }
}
