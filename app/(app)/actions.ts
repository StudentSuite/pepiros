"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { isDemoAccount } from "@/lib/data/demo";
import type { OnboardingResponse } from "@/lib/data/types";
import { createMcpToken, revokeMcpToken } from "@/lib/services/mcpTokens";
import type { McpScope } from "@/lib/services/mcpAuth";

/**
 * Delete posts owned by the signed-in account.
 *
 * The author id comes from the session, never from the client, so a caller
 * cannot pass someone else's id and delete their posts. Ownership is enforced
 * again in the adapter's Supabase implementation via RLS.
 */
export async function deletePostsAction(ids: string[]) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");

  const adapter = getAdapter();
  for (const id of ids) {
    await adapter.deletePost(profile.id, id);
  }

  revalidatePath("/posts");
  revalidatePath("/analytics");
  revalidatePath("/home");
}

/**
 * Persist onboarding answers.
 *
 * profileId is taken from the session and overwrites whatever the client sent,
 * so a caller cannot write answers onto someone else's profile.
 */
export async function saveOnboardingAction(response: OnboardingResponse) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");

  await getAdapter().saveOnboarding({ ...response, profileId: profile.id });
  revalidatePath("/home");
}

/**
 * Persist a display name/bio edit (components/settings/ProfileForm.tsx).
 * Used to just await a setTimeout and show a success toast with no real
 * write at all -- the same silently-vanishing-edit failure mode the
 * node-editor Save bug was, before that one got its own real fix. The
 * profile id comes from the session, never the client, same reasoning as
 * every other action here.
 *
 * Issue #319: ProfileForm already disables its inputs client-side for the
 * demo account (its own `readOnly` prop), but this, the real write path,
 * had no server-side check at all -- the exact
 * client-readOnly-prop-isn't-enough gap CLAUDE.md documents for
 * McpTokens/NotificationPrefs (issue #214), just not yet closed here.
 */
export async function updateProfileAction(input: { displayName: string; bio: string }) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");
  if (isDemoAccount(profile)) {
    throw new Error("The shared demo account can't edit its profile -- everyone who tries Pepiros shares it.");
  }

  const updated = await getAdapter().updateProfile(profile.id, input);
  revalidatePath("/settings/profile");
  revalidatePath(`/u/${updated.username}`);
  return updated;
}

/**
 * Mint a real MCP token (lib/services/mcpTokens.ts, backed by
 * lib/services/mcpAuth.ts's hashing). The raw token is returned to the
 * caller exactly once here and is never retrievable again -- only its hash
 * is kept.
 */
export async function createMcpTokenAction(input: { label: string; scope: McpScope }) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");
  // Issue #214: the create form is now disabled client-side for the demo
  // account, but this is the real write path -- a stale/re-enabled client
  // shouldn't be able to mint a real token that could be used to read/write
  // the shared demo workspace on behalf of every other demo visitor.
  if (isDemoAccount(profile)) {
    throw new Error("The shared demo account can't create MCP tokens -- everyone who tries Pepiros shares it.");
  }

  const label = input.label.trim() || "Untitled token";
  const result = await createMcpToken({ label, scope: input.scope, workspaceId: null, profileId: profile.id });
  revalidatePath("/settings/mcp-tokens");
  return result;
}

export async function revokeMcpTokenAction(id: string) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");
  if (isDemoAccount(profile)) {
    throw new Error("The shared demo account can't revoke MCP tokens -- that would break every other demo visitor's session.");
  }

  await revokeMcpToken(id, profile.id);
  revalidatePath("/settings/mcp-tokens");
}
