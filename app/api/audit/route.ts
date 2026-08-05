// POST. Reverse audit: paste external summary text, sentence-split, verify each against source. Reuses
// lib/grounding/verify.ts's thresholds via lib/grounding/reverseAudit.ts.
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWorkspace } from "@/lib/store/workspace";
import { auditText } from "@/lib/grounding/reverseAudit";

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
  const workspace = await fetchWorkspace(workspaceId);
  const sentences = auditText(text, workspace.chunks, workspace.numerics);

  const dropRate = sentences.length
    ? sentences.filter((s) => s.tier === "unsupported").length / sentences.length
    : 0;

  return NextResponse.json({ sentences, dropRate });
}
