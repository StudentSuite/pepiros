import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { workspaceExists } from "@/lib/services/workspaces";
import { getWorkspaceOwnerId } from "@/lib/db/queries";
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
 * Issue #231 completed the other half. Workspaces now carry an `owner_id`
 * (supabase/migrations/0006_workspace_owner.sql), so requireWorkspaceSession()
 * checks that the session owns the workspace rather than only that a session
 * exists. A workspace with no owner -- one created before that column, or
 * through a path that never set one -- keeps the old any-session behaviour
 * rather than locking somebody out of work they already had; everything
 * created since has an owner and gets the strict check.
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

  // Issue #231: this used to stop at "a session exists", which left one
  // signed-in account able to mutate another's workspace. Workspaces now
  // carry an owner, so the check can be the real one.
  const ownerId = await getWorkspaceOwnerId(workspaceId);

  // A null owner is a workspace created before owner_id existed, or through a
  // path that never set one. It is not claimed by the asker: the pre-#231
  // behaviour (any session may write) is preserved for those rows only, so
  // this migration does not lock people out of work they already had. Every
  // workspace created from here on has an owner and gets the strict check.
  if (ownerId === null) return null;

  if (ownerId !== session.id) {
    // 404, not 403: a 403 confirms the workspace exists to somebody probing
    // ids, which is a disclosure the id space is not random enough to afford.
    return NextResponse.json(
      { error: "not_found", detail: `No workspace ${workspaceId}.` },
      { status: 404 },
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
 * workspaceExists() itself already existed (lib/services/workspaces.ts, for
 * the MCP list_workspaces path) but had no caller -- reused here rather
 * than adding a second copy of the same fixture-or-ingested check.
 */

/** Returns a 404 `NextResponse` for an unrecognized workspaceId; `null` when the request should proceed. */
export async function requireWorkspaceExists(workspaceId: string): Promise<NextResponse | null> {
  if (await workspaceExists(workspaceId)) return null;
  return NextResponse.json(
    { error: "not_found", detail: `No workspace ${workspaceId}.` },
    { status: 404 },
  );
}
