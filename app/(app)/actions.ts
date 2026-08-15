"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import type { OnboardingResponse } from "@/lib/data/types";

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
