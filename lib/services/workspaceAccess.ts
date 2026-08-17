import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getIngestedWorkspace } from "@/lib/services/ingestStore";
import workspaceFixture from "@/fixtures/workspace.json";
import type { Workspace } from "@/types/anchor";

/**
 * Issue #78 (P0): none of the workspace-scoped API routes checked a session
 * at all -- confirmed live on the real deployment, pepiros.vercel.app, that
 * anyone who knows or guesses a workspaceId could mutate or trigger paid
 * LLM calls against any workspace with zero authentication.
 *
 * Scope of this fix is deliberately narrower than "every route": only the
 * genuinely persistent-mutation / paid-generation routes call this --
 * nodes create/update/delete, chat/promote, expand (the followup-chip node
 * generator), compare (full pairwise synthesis), and share (mints a
 * durable token). Reads (workspace, graph, export, related, node GET) and
 * the guest-facing generation routes (chat, quiz, verify, audit, ingest)
 * deliberately do NOT call this -- middleware.ts's own header comment locks
 * in "`/w` (the reader and canvas) and `/upload` are open to guests. Sign-in
 * buys persistence, not access." Gating those would break the documented,
 * intentional guest experience, not fix a bug. Anonymous chat/quiz calls do
 * still cost LLM tokens per-request, same as anonymous ingest already does
 * by design -- that's an accepted cost of the guest model, not this issue's
 * "mutate/persist for free" hole.
 *
 * This is also NOT yet full per-owner scoping (one signed-in user blocked
 * from another's workspace): `Workspace` has no `ownerId` field, and there's
 * no web-facing "create a workspace" route to attach one to in the first
 * place -- the only creator today is MCP's `create_workspace` tool, which
 * has its own separate token-based auth and isn't tied to a web session's
 * profile at all. Closing the "fully anonymous mutation, no auth needed at
 * all" hole is the real, scoped fix here; real per-owner isolation is
 * follow-up work once workspaces have an owner to check against.
 */
const FIXTURE_ID = (workspaceFixture as unknown as Workspace).id;

/**
 * Returns a 401 `NextResponse` to return immediately if the caller isn't
 * signed in and isn't asking for the public fixture; returns `null` when
 * the request should proceed.
 */
export async function requireWorkspaceSession(workspaceId: string): Promise<NextResponse | null> {
  if (workspaceId === FIXTURE_ID) return null;

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Sign in to access this workspace." },
      { status: 401 },
    );
  }
  return null;
}

/**
 * Issue #81: lib/services/workspace.ts's fetchWorkspace() falls back to the
 * static fixture for ANY workspaceId that was never actually ingested into,
 * silently -- a typo'd or probed id got served the exact same "valid-
 * looking" demo workspace ws-1 itself returns, so a caller couldn't tell
 * "doesn't exist" from "exists but I have no access to it," which made #78's
 * gap worse in practice. fetchWorkspace() itself is left alone (changing
 * its contract from "always returns a Workspace" ripples into ~20 call
 * sites, several of them internal service functions that assume a result
 * always comes back) -- this is a route-level guard instead, same shape as
 * requireWorkspaceSession() above, called before fetchWorkspace() so an
 * unrecognized id 404s before ever reaching the fixture fallback.
 */
export async function workspaceExists(workspaceId: string): Promise<boolean> {
  if (workspaceId === FIXTURE_ID) return true;
  return (await getIngestedWorkspace(workspaceId)) !== undefined;
}

/** Returns a 404 `NextResponse` for an unrecognized workspaceId; `null` when the request should proceed. */
export async function requireWorkspaceExists(workspaceId: string): Promise<NextResponse | null> {
  if (await workspaceExists(workspaceId)) return null;
  return NextResponse.json(
    { error: "not_found", detail: `No workspace ${workspaceId}.` },
    { status: 404 },
  );
}
