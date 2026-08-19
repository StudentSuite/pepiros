import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { getAdapter } from "@/lib/data/adapter";
import { getSession } from "@/lib/auth/session";
import { seedCatalogStats, seedPaperComments } from "@/lib/data/seed";
import { articleFor } from "@/lib/data/paperContent";
import {
  ArticleBody,
  ArticleHeader,
  ArticleRule,
  Byline,
  Dot,
  ReadingColumn,
} from "@/components/reading/Article";
import { ClaimBlock } from "@/components/reading/ClaimBlock";
import { PaperEngagement } from "./PaperEngagement";
import { CommentForm } from "./CommentForm";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getAdapter().getCatalogPaper(slug);
  if (!paper) return { title: "Paper not found" };

  const article = articleFor(paper);
  return {
    title: paper.title,
    description: article.dek,
    openGraph: { title: paper.title, description: article.dek, type: "article" },
  };
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paper = await getAdapter().getCatalogPaper(slug);
  if (!paper) notFound();

  const stats = seedCatalogStats(paper.id, paper.year);
  const article = articleFor(paper);
  const byline = paper.authors.slice(0, 3).join(", ") + (paper.authors.length > 3 ? ", et al." : "");

  // A real `posts` row (matched by paper_id) means this paper has actually
  // been published on the live platform -- real comments/likes attach to
  // that row. No matching row (seed mode, or nobody's published this one
  // yet) keeps the illustrative seed rendering exactly as before.
  const adapter = getAdapter();
  const post = await adapter.getPostByPaperId(paper.id);
  const viewer = await getSession();

  const comments = post ? await adapter.listCommentsForPost(post.id) : seedPaperComments(paper.id);
  const likeState = post ? await adapter.getLikeState(post.id, viewer?.id ?? null) : null;

  return (
    <main className="pb-s-5">
      <ReadingColumn>
        <ArticleHeader kicker={paper.field} title={paper.title} dek={article.dek}>
          <Byline
            name={`@${stats.postedBy}`}
            href={`/u/${stats.postedBy}`}
            initials={stats.postedBy.slice(0, 2).toUpperCase()}
            meta={
              [
                `${article.readingMinutes} min read`,
                `${Math.round(stats.groundingCoverage * 100)}% grounded`,
                paper.openAccess ? "Open access" : "Paywalled source",
              ].join(" · ")
            }
            action={
              <PaperEngagement
                initialScore={likeState ? likeState.count : stats.score}
                real={post ? { postId: post.id, slug, initiallyLiked: likeState!.liked } : undefined}
              />
            }
          />
        </ArticleHeader>

        {/* Source line. Kept immediately under the byline because the whole
            proposition is that the original is one click away. */}
        <p className="font-sans text-[13px] leading-relaxed text-ink-faint">
          {byline} &middot; <span className="italic">{paper.venue}</span> &middot;{" "}
          {paper.year}
          {" · "}
          <a
            href={paper.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-0.5 text-accent-text underline underline-offset-2"
          >
            Read the original
            <ArrowUpRight className="size-3" />
          </a>
        </p>

        <ArticleBody className="mt-s-6">
          <p>{article.standfirst}</p>
        </ArticleBody>

        {article.pillars.map((pillar) => (
          <section key={pillar.title} className="mt-s-7">
            <h2 className="font-serif text-[1.45rem] leading-snug text-ink">
              {pillar.title}
            </h2>
            <p className="mt-s-2 font-sans text-[15px] leading-relaxed text-ink-faint">
              {pillar.summary}
            </p>
            <div className="mt-s-5 flex flex-col gap-s-6">
              {pillar.claims.map((claim) => (
                <ClaimBlock key={claim.id} claim={claim} />
              ))}
            </div>
          </section>
        ))}

        <ArticleRule />

        <section>
          <h2 className="font-serif text-[1.45rem] leading-snug text-ink">
            What this does not establish
          </h2>
          <ArticleBody className="mt-s-4">
            <ul>
              {article.doesNotEstablish.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ArticleBody>
        </section>

        <ArticleRule />

        {/* Discussion */}
        <section>
          <div className="flex items-center gap-s-2">
            <MessageSquare className="size-4 text-ink-faint" strokeWidth={1.5} />
            <h2 className="font-serif text-[1.45rem] leading-snug text-ink">
              Discussion
            </h2>
            <span className="font-mono text-[11px] text-ink-faint">
              {comments.length}
            </span>
          </div>

          <ul className="mt-s-5 flex flex-col">
            {comments.map((c, i) => (
              <li
                key={c.id}
                className={i > 0 ? "border-t border-border pt-s-5" : undefined}
              >
                <div className={i > 0 ? "" : "pb-s-5"}>
                  <div className="flex items-center gap-s-3">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-subtle font-mono text-[10px] text-ink-muted">
                        {c.authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/u/${c.authorUsername}`}
                      className="font-sans text-sm font-medium text-ink hover:text-accent-text"
                    >
                      {c.authorName}
                    </Link>
                    {c.claimRef && (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                        on {c.claimRef}
                      </span>
                    )}
                    <Dot />
                    <span className="font-sans text-[13px] text-ink-faint">
                      {c.createdAt}
                    </span>
                  </div>
                  <p className="mt-s-2 pl-[2.5rem] font-sans text-[15px] leading-relaxed text-ink-muted">
                    {c.body}
                  </p>
                </div>
                {i > 0 && i < comments.length - 1 ? <div className="pb-s-5" /> : null}
              </li>
            ))}
          </ul>

          {post ? (
            <CommentForm postId={post.id} slug={slug} signedIn={Boolean(viewer)} />
          ) : (
            <p className="mt-s-6 rounded-md border border-dashed border-border px-s-4 py-s-4 font-sans text-[13px] leading-relaxed text-ink-faint">
              This paper hasn&rsquo;t been published on the live platform yet, so
              there&rsquo;s no real post to attach a comment to -- the discussion
              above is illustrative. Once it is (or on a paper someone has
              actually posted), a comment can be attached to one specific claim
              rather than the paper as a whole, which is the only way
              disagreement stays legible.
            </p>
          )}
        </section>
      </ReadingColumn>
    </main>
  );
}
