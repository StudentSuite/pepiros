import { CATALOG, paperAddedAt, type CatalogPaper } from "./papers";
import type { Comment, Post } from "./types";

/**
 * The signed-in dashboard's activity feed.
 *
 * WHAT THIS DELIBERATELY IS NOT. There is no events table in this app, and no
 * per-account reading history (types/anchor.ts's Workspace has no ownerId,
 * and there is no reading-progress table). A GitHub-style dashboard invites
 * you to fill that gap with plausible-looking activity, and app/(app)/home
 * has already had two rounds of exactly that removed: a fabricated "continue
 * reading" card (issue #92) and a grounding percentage rendered for posts
 * that had never been through the verifier (issue #282).
 *
 * So this feed is assembled ONLY from records that already exist and already
 * carry a real date:
 *
 *   published   post.publishedAt        you published a paper
 *   comment     comment.createdAt       somebody replied on one of your papers
 *   catalog     paperAddedAt(paper)     a paper entered the open catalog
 *
 * That is a thinner feed than GitHub's, and it is the honest one. If it looks
 * sparse for a new account, the correct fix is to ship something that
 * generates real events, not to soften the emptiness with invented ones.
 */

export type ActivityKind = "published" | "comment" | "catalog";

export interface ActivityEvent {
  kind: ActivityKind;
  /** ISO date, YYYY-MM-DD. What the feed sorts on. */
  date: string;
  /** The sentence, already assembled. */
  title: string;
  /** Muted second line. A comment body, an author list. */
  detail?: string;
  href: string;
}

/** Comment bodies run long and each row gets one line. */
function clamp(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Merge the three real sources into one dated feed, newest first.
 *
 * Pure and dependency-free so it can be reasoned about (and tested) without a
 * database: callers pass in what they already fetched.
 */
export function buildActivityFeed({
  posts,
  comments,
  papers = CATALOG,
  limit = 12,
}: {
  posts: Post[];
  comments: Comment[];
  papers?: readonly CatalogPaper[];
  limit?: number;
}): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const paperById = new Map(papers.map((p) => [p.id, p]));
  const postById = new Map(posts.map((p) => [p.id, p]));

  for (const post of posts) {
    if (post.status !== "published") continue;
    events.push({
      kind: "published",
      date: post.publishedAt,
      title: `You published ${post.title}`,
      detail: `${post.authors[0] ?? "Unknown"}${post.authors.length > 1 ? " et al." : ""}, ${post.year}`,
      href: `/posts`,
    });
  }

  for (const comment of comments) {
    const post = postById.get(comment.postId);
    const paper = post ? paperById.get(post.paperId) : undefined;
    events.push({
      kind: "comment",
      date: comment.createdAt,
      title: `@${comment.authorUsername} commented on ${post?.title ?? "your paper"}`,
      detail: clamp(comment.body),
      // Anchored to the claim when the comment is, which is the whole point of
      // claim-scoped comments: the link should land on the sentence argued
      // about, not the top of the page.
      href: paper
        ? `/paper/${paper.slug}#${comment.claimRef ? comment.claimRef : "comments"}`
        : "/comments",
    });
  }

  for (const paper of papers) {
    events.push({
      kind: "catalog",
      date: paperAddedAt(paper),
      title: `${paper.title} was added to the open catalog`,
      detail: `${paper.authors[0] ?? "Unknown"}${paper.authors.length > 1 ? " et al." : ""}, ${paper.year}`,
      href: `/paper/${paper.slug}`,
    });
  }

  return events
    // Dates are ISO YYYY-MM-DD, so a string comparison IS a date comparison
    // and there is no need to construct 300 Date objects to sort them.
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit);
}
