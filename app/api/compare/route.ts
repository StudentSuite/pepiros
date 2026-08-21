// POST. Cross-paper synthesis (docs/PLAN-V1.md §10): pairwise comparison
// over every pair of papers in a workspace, writing real agrees/contradicts/
// extends/shares_method/relates edges (each backed by two-sided verified
// evidence) plus Consensus/Contradictions synthesis nodes. Calls
// lib/services/synthesis.ts only, per CLAUDE.md's service-layer boundary.
import { NextResponse } from "next/server";
import { z } from "zod";
import { runSynthesis } from "@/lib/services/synthesis";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";
import { UserFacingError } from "@/lib/errors";

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
    // Issue #266: this used to return any err.message verbatim -- an
    // unexpected AI-SDK exception or a non-UserFacingError DB failure
    // reached the client raw. Matches app/api/nodes/route.ts's established
    // pattern (issue #107): a UserFacingError (e.g. setIngestedWorkspace's
    // version-conflict message) is already a deliberate, safe-to-show
    // message and passes through; the config-key check is the other
    // deliberately-safe case; anything else is logged and genericized.
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: "synthesis_failed", detail: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    if (isConfig) {
      return NextResponse.json({ error: "model_not_configured", detail: message }, { status: 503 });
    }
    console.error("[api/compare] runSynthesis failed:", err);
    return NextResponse.json(
      { error: "synthesis_failed", detail: "Could not run synthesis right now. Try again." },
      { status: 500 },
    );
  }
}
