// POST. Reverse audit: paste external summary text, sentence-split, verify each against source. Reuses
// lib/grounding/verify.ts's thresholds via lib/grounding/reverseAudit.ts.
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditTextAgainstWorkspace } from "@/lib/services/audit";

const bodySchema = z.object({
  workspaceId: z.string(),
  text: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const { workspaceId, text } = parsed.data;
  return NextResponse.json(await auditTextAgainstWorkspace(workspaceId, text));
}
