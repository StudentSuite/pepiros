// POST. Single claim verification (workspaceId, nodeId, refId, quote) -> quote_located|paraphrase|unsupported +
// numeric-floor result. This is the deterministic core the MCP verify_claim tool also calls via
// lib/services/verify.ts. See PLAN-V1.md §4.4.
//
// No live DB yet (plan.md's Supabase project isn't provisioned) -- reads through fetchWorkspace(), which currently
// always resolves the fixture regardless of workspaceId. Swapping fetchWorkspace()'s implementation to a real
// Supabase read is the only change needed once a project exists; this route and lib/services/verify.ts don't change.
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWorkspace } from "@/lib/services/workspace";
import { verifyClaimsAgainstCorpus } from "@/lib/services/verify";
import { requireWorkspaceExists } from "@/lib/services/workspaceAccess";

const bodySchema = z.object({
  workspaceId: z.string(),
  nodeId: z.string(),
  refId: z.string(),
  quote: z.string(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const { workspaceId, nodeId, refId, quote } = parsed.data;
  const notFound = await requireWorkspaceExists(workspaceId);
  if (notFound) return notFound;

  const workspace = await fetchWorkspace(workspaceId);

  const [result] = verifyClaimsAgainstCorpus({
    chunks: workspace.chunks,
    numerics: workspace.numerics,
    claims: [{ nodeId, refId, quote }],
  });

  return NextResponse.json(result);
}
