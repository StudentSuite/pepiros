// POST. Mints a share token for a workspace (docs/PLAN-V1.md `share_tokens`
// table). Calls lib/services/share.ts only, per CLAUDE.md's service-layer
// boundary.
import { NextResponse } from "next/server";
import { z } from "zod";
import { createShareToken } from "@/lib/services/share";
import { requireWorkspaceSession } from "@/lib/services/workspaceAccess";

const bodySchema = z.object({ workspaceId: z.string().min(1) });

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const denial = await requireWorkspaceSession(parsed.data.workspaceId);
  if (denial) return denial;

  const token = createShareToken(parsed.data.workspaceId);
  return NextResponse.json({ token, url: `${appUrl()}/s/${token}` });
}
