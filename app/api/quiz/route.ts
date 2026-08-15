// GET ?workspaceId=... Quiz questions derived from the workspace's actually
// quote_located leaves (docs/PLAN-V1.md §8's `quiz` generator). Calls
// lib/services/quiz.ts only, per CLAUDE.md's service-layer boundary.
import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/services/quiz";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "invalid_query", detail: "workspaceId is required." }, { status: 400 });
  }

  try {
    const questions = await generateQuiz(workspaceId);
    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isConfig = message.includes("GROQ_API_KEY") || message.includes("FEATHERLESS_API_KEY");
    return NextResponse.json(
      { error: isConfig ? "model_not_configured" : "quiz_failed", detail: message },
      { status: isConfig ? 503 : 500 },
    );
  }
}
