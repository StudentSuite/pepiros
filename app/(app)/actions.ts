"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
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
 * Mint a real MCP token (lib/services/mcpTokens.ts, backed by
 * lib/services/mcpAuth.ts's hashing). The raw token is returned to the
 * caller exactly once here and is never retrievable again -- only its hash
 * is kept.
 */
export async function createMcpTokenAction(input: { label: string; scope: McpScope }) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");

  const label = input.label.trim() || "Untitled token";
  const result = createMcpToken({ label, scope: input.scope, workspaceId: null });
  revalidatePath("/settings/mcp-tokens");
  return result;
}

export async function revokeMcpTokenAction(id: string) {
  const profile = await getSession();
  if (!profile) throw new Error("Not signed in.");

  revokeMcpToken(id);
  revalidatePath("/settings/mcp-tokens");
}
