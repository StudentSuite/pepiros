"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { isDemoAccount } from "@/lib/data/demo";

/**
 * Real publish/follow/comment writes (docs §platform), backed by the
 * `comments`/`likes`/`follows` tables via lib/data/adapter.ts. Author/liker/
 * follower ids all come from the session, never the client -- a caller can
 * ask to like or follow, but cannot assert whose like or follow it is.
 *
 * Issue #319: found while auditing copy, not a copy problem itself -- the
 * guest banner (components/auth/GuestBanner.tsx) tells every guest
 * "Nothing you do there is saved," but none of these three actions actually
 * enforced that. Only MCP token minting and danger-zone deletion checked
 * isDemoAccount() (issue #214's own fix); comments, likes, and follows did
 * not, so a signed-in guest's like/comment/follow was a real, persistent
 * write visible to every subsequent guest visitor -- the exact
 * client-readOnly-prop-isn't-enough gap CLAUDE.md already documents for
 * McpTokens/NotificationPrefs, just in three more places it hadn't reached
 * yet. Fixing the write path is what makes the banner's claim true again,
 * not a rewrite of the banner.
 */

export async function addCommentAction(input: {
  postId: string;
  slug: string;
  body: string;
  claimRef?: string | null;
}) {
  const profile = await getSession();
  if (!profile) throw new Error("Sign in to comment.");
  if (isDemoAccount(profile)) {
    throw new Error("The shared demo account can't post comments -- everyone who tries Pepiros shares it.");
  }

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
  if (isDemoAccount(profile)) {
    throw new Error("The shared demo account can't like papers -- everyone who tries Pepiros shares it.");
  }

  await getAdapter().setLiked(input.postId, profile.id, input.liked);
  revalidatePath(`/paper/${input.slug}`);
}

export async function toggleFollowAction(input: { followeeId: string; username: string; following: boolean }) {
  const profile = await getSession();
  if (!profile) throw new Error("Sign in to follow.");
  if (isDemoAccount(profile)) {
    throw new Error("The shared demo account can't follow accounts -- everyone who tries Pepiros shares it.");
  }

  await getAdapter().setFollowing(profile.id, input.followeeId, input.following);
  revalidatePath(`/u/${input.username}`);
}
