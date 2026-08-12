// POST. Grounded chat (docs/PLAN-V1.md §9.4): query rewrite -> route classifier
// -> context block with stable ids -> answer -> citation parse -> post-answer
// verification through the same deterministic verifier the generators use.
//
// Calls lib/services/chat.ts only, per the service-layer boundary in CLAUDE.md.
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/lib/services/chat";

const bodySchema = z.object({
  workspaceId: z.string(),
  question: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  scope: z.enum(["all", "paper", "node"]).optional(),
  paperId: z.string().optional(),
  allowUngrounded: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    return NextResponse.json(await answerQuestion(parsed.data));
  } catch (err) {
    // A missing/rejected model key is the common case here and is worth
    // naming: a generic 500 sends someone digging through server logs for
    // something the message could have told them.
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    return NextResponse.json(
      { error: isConfig ? "model_not_configured" : "chat_failed", detail: message },
      { status: isConfig ? 503 : 500 },
    );
  }
}
