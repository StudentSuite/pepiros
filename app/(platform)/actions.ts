"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";

/**
 * Real publish/follow/comment writes (docs §platform), backed by the
 * `comments`/`likes`/`follows` tables via lib/data/adapter.ts. Author/liker/
 * follower ids all come from the session, never the client -- a caller can
 * ask to like or follow, but cannot assert whose like or follow it is.
 */

export async function addCommentAction(input: {
  postId: string;
  slug: string;
  body: string;
  claimRef?: string | null;
}) {
  const profile = await getSession();
  if (!profile) throw new Error("Sign in to comment.");

  const body = input.body.trim();
  if (!body) throw new Error("Comment can't be empty.");

  const comment = await getAdapter().addComment({
    postId: input.postId,
    authorId: profile.id,
    body,
    claimRef: input.claimRef ?? null,
  });
  revalidatePath(`/paper/${input.slug}`);
  return comment;
}

export async function toggleLikeAction(input: { postId: string; slug: string; liked: boolean }) {
  const profile = await getSession();
  if (!profile) throw new Error("Sign in to like this paper.");

  await getAdapter().setLiked(input.postId, profile.id, input.liked);
  revalidatePath(`/paper/${input.slug}`);
}

export async function toggleFollowAction(input: { followeeId: string; username: string; following: boolean }) {
  const profile = await getSession();
  if (!profile) throw new Error("Sign in to follow.");

  await getAdapter().setFollowing(profile.id, input.followeeId, input.following);
  revalidatePath(`/u/${input.username}`);
}
