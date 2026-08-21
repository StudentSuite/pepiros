// POST. Grounded chat (docs/PLAN-V1.md §9.4): query rewrite -> route classifier
// -> context block with stable ids -> answer -> citation parse -> post-answer
// verification through the same deterministic verifier the generators use.
//
// Calls lib/services/chat.ts only, per the service-layer boundary in CLAUDE.md.
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/lib/services/chat";
import { requireWorkspaceExists } from "@/lib/services/workspaceAccess";

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
  // Issue #267: without .catch(), a malformed/non-JSON body threw before
  // safeParse ran, producing an unhandled 500 instead of a graceful 400.
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const notFound = await requireWorkspaceExists(parsed.data.workspaceId);
  if (notFound) return notFound;

  try {
    return NextResponse.json(await answerQuestion(parsed.data));
  } catch (err) {
    // A missing/rejected model key is the common case here and is worth
    // naming: a generic 500 sends someone digging through server logs for
    // something the message could have told them. That specific check
    // (does the message mention one of the two key env vars) is the one
    // deliberately-safe-to-show case; issue #266: anything else used to
    // reach the client as this same raw err.message, potentially leaking an
    // internal AI-SDK exception detail. Matches the UserFacingError-vs-
    // generic pattern app/api/nodes/route.ts already established (issue
    // #107) -- log the real error, return a generic message for anything
    // that isn't the named config case.
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    if (isConfig) {
      return NextResponse.json({ error: "model_not_configured", detail: message }, { status: 503 });
    }
    console.error("[api/chat] answerQuestion failed:", err);
    return NextResponse.json(
      { error: "chat_failed", detail: "Could not answer that right now. Try again." },
      { status: 500 },
    );
  }
}
