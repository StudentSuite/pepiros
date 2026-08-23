import { describe, expect, it } from "vitest";
import { buildActivityFeed } from "./activity";
import type { CatalogPaper } from "./papers";
import type { Comment, Post } from "./types";

/**
 * The feed's whole job is to be honest about dates and sources, so that is
 * what these check: that only real records become events, that the merge is
 * ordered, and that a claim-anchored comment links to the claim rather than
 * the top of the page.
 */

function post(over: Partial<Post> = {}): Post {
  return {
    id: "p1",
    authorId: "u-guest",
    paperId: "cat-1",
    title: "A Paper",
    authors: ["Ada Lovelace", "Alan Turing"],
    year: 2020,
    venue: "Venue",
    field: "Machine learning",
    openAccess: true,
    sourceUrl: "https://example.org",
    status: "published",
    publishedAt: "2026-08-10",
    groundingCoverage: null,
    dropRate: null,
    ...over,
  } as Post;
}

function comment(over: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    postId: "p1",
    authorName: "Reader",
    authorUsername: "reader",
    authorInitials: "R",
    body: "Checked this against the ledger.",
    createdAt: "2026-08-12",
    claimRef: null,
    read: false,
    ...over,
  };
}

const paper = {
  id: "cat-1",
  slug: "a-paper",
  title: "A Paper",
  authors: ["Ada Lovelace"],
  year: 2020,
  venue: "Venue",
  field: "Machine learning",
  licence: "cc-by",
  sourceUrl: "https://example.org",
  addedAt: "2026-08-01",
} as unknown as CatalogPaper;

describe("buildActivityFeed", () => {
  it("orders every lane together, newest first", () => {
    const feed = buildActivityFeed({
      posts: [post()],
      comments: [comment()],
      papers: [paper],
    });

    expect(feed.map((e) => e.date)).toEqual(["2026-08-12", "2026-08-10", "2026-08-01"]);
    expect(feed.map((e) => e.kind)).toEqual(["comment", "published", "catalog"]);
  });

  it("ignores drafts: an unpublished post is not an event", () => {
    const feed = buildActivityFeed({
      posts: [post({ status: "draft" as Post["status"] })],
      comments: [],
      papers: [],
    });
    expect(feed).toEqual([]);
  });

  it("anchors a claim-scoped comment to its claim, not the comment section", () => {
    const [event] = buildActivityFeed({
      posts: [post()],
      comments: [comment({ claimRef: "C7" })],
      papers: [paper],
    });
    expect(event?.href).toBe("/paper/a-paper#C7");
  });

  it("falls back to the comment section when the comment has no claim", () => {
    const [event] = buildActivityFeed({
      posts: [post()],
      comments: [comment()],
      papers: [paper],
    });
    expect(event?.href).toBe("/paper/a-paper#comments");
  });

  it("clamps a long comment body rather than letting it run the row", () => {
    const [event] = buildActivityFeed({
      posts: [post()],
      comments: [comment({ body: "x".repeat(500) })],
      papers: [],
    });
    expect(event?.detail?.length).toBeLessThanOrEqual(160);
    expect(event?.detail?.endsWith("…")).toBe(true);
  });

  it("respects the limit", () => {
    const posts = Array.from({ length: 30 }, (_, i) =>
      post({ id: `p${i}`, publishedAt: `2026-07-${String((i % 28) + 1).padStart(2, "0")}` }),
    );
    expect(buildActivityFeed({ posts, comments: [], papers: [], limit: 5 })).toHaveLength(5);
  });
});
