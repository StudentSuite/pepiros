import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { getAdapter } from "@/lib/data/adapter";
import { getSession } from "@/lib/auth/session";
import { seedCatalogStats, seedPaperComments } from "@/lib/data/seed";
import { paperDek } from "@/lib/data/paperContent";
import { licenceLabel } from "@/lib/data/papers";
import { fetchWorkspace } from "@/lib/services/workspace";
import { computeGroundingStats } from "@/lib/services/groundingStats";
import { GroundedArticle } from "@/components/reading/GroundedArticle";
import {
  ArticleBody,
  ArticleHeader,
  ArticleRule,
  Byline,
  Dot,
  ReadingColumn,
} from "@/components/reading/Article";
import { PaperEngagement } from "./PaperEngagement";
import { CommentForm } from "./CommentForm";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { buttonClassName } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getAdapter().getCatalogPaper(slug);
  // Issue #257: returning a "not found" title here and leaving notFound() to
  // the page body sent 200. generateMetadata resolves first and the response
  // starts streaming with its status already committed, so by the time the
  // body called notFound() the 404 could no longer be set. Deciding it here
  // is what actually produces the status, and search engines and link
  // checkers read the status, not the heading.
  if (!paper) notFound();

  const dek = paperDek(paper);
  return {
    title: paper.title,
    description: dek,
    openGraph: { title: paper.title, description: dek, type: "article" },
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

  // Issue #283: the write-up is read from the paper's own workspace, through
  // the same service layer the reader uses, rather than generated here. A
  // paper that has not been indexed yet (issue #279) has no workspaceId and
  // falls through to the honest not-indexed state below.
  const workspace = paper.workspaceId ? await fetchWorkspace(paper.workspaceId) : null;
  // Issue #282: measured, not seeded. Null when there is nothing to measure,
  // and never coerced to zero: a paper with no evidence rows has no coverage
  // figure, it has not scored zero.
  const grounding = workspace ? computeGroundingStats(workspace) : null;

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
        <ArticleHeader kicker={paper.field} title={paper.title} dek={paperDek(paper)}>
          <Byline
            name={`@${stats.postedBy}`}
            href={`/u/${stats.postedBy}`}
            initials={stats.postedBy.slice(0, 2).toUpperCase()}
            /* Issues #253/#259: this used to read "N min read - N% grounded".
               Both were fabricated -- reading time was `4 + (hash % 7)` and
               the grounding percentage came from lib/data/seed.ts, not from
               the verifier, on a page whose whole claim is that its numbers
               are measured. A grounded percentage returns when there are real
               evidence rows to compute it from (issues #279, #282). */
            meta={[
              // Only shown when the verifier actually produced it. That is the
              // whole of issues #259/#282: a number on this page is either
              // measured or absent, never invented to fill the slot.
              grounding?.coverage !== null && grounding !== null
                ? `${Math.round(grounding.coverage * 100)}% grounded`
                : null,
              licenceLabel(paper.licence),
            ]
              .filter(Boolean)
              .join(" · ")}
            action={
              <PaperEngagement
                initialScore={likeState ? likeState.count : stats.score}
                real={post ? { postId: post.id, slug, initiallyLiked: likeState!.liked } : undefined}
              />
            }
          />
        </ArticleHeader>

        {/* Issue #258: the byline, like count and discussion below are all
            lib/data/seed.ts fixtures until a real post exists for this
            paper -- nothing on the page said so, and this product's whole
            position is that a reader can tell what's real from what's
            asserted. Fabricated discussion presented as discussion
            undercuts that on the surface where it's most visible. */}
        {!post && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Sample author &amp; engagement, to show the format
          </p>
        )}

        {/* Source line. Kept immediately under the byline because the whole
            proposition is that the original is one click away. */}
        <p className="mt-s-1 font-sans text-[13px] leading-relaxed text-ink-faint">
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

        {/* Issue #255/#281: the only /w/ link anywhere on this page used to
            be the site footer's "Try the demo", which points at ws-1
            regardless of which paper this is -- a reader browsing e.g.
            AlphaFold's write-up who clicked the only available reading
            link landed in an unrelated sleep-and-circadian demo workspace.
            Catalog papers aren't indexed yet (issue #279: scripts/index-
            catalog.ts hasn't been run against any of them), so every
            paper.workspaceId is undefined today -- this renders the honest
            not-yet-openable state until that changes, rather than
            silently falling back to a demo link. */}
        {paper.workspaceId ? (
          <Link
            href={`/w/${paper.workspaceId}`}
            className={buttonClassName("primary", "sm", "mt-s-4")}
          >
            Open in reader
          </Link>
        ) : (
          <p className="mt-s-4 rounded-md border border-dashed border-border px-s-4 py-s-3 font-sans text-[13px] leading-relaxed text-ink-faint">
            This paper isn&rsquo;t indexed for reading in Pepiros yet -- read the
            original at the source link above.
          </p>
        )}

        {workspace ? (
          <>
            {/* Issue #283: the real write-up, read from this paper's own
                workspace through the same buildClaimSummaries the reader's
                claim stack uses, so the public page and the workspace cannot
                disagree about a paper. Nothing here is generated at render
                time. */}
            <GroundedArticle workspace={workspace} />

            {grounding?.coverage !== null && grounding !== null && (
              <p className="mt-s-6 rounded-md border border-dashed border-border px-s-4 py-s-3 font-mono text-[11px] leading-relaxed text-ink-faint">
                {/* The denominators, not just the percentage: "93% grounded"
                    with nothing behind it is the kind of number this whole
                    milestone was about removing. */}
                {grounding.citedChunks} of {grounding.totalChunks} passages cited across{" "}
                {grounding.totalEvidence} claims.
                {grounding.dropRate !== null &&
                  ` ${grounding.droppedEvidence} claimed quote${grounding.droppedEvidence === 1 ? "" : "s"} failed verification and had the citation stripped (${Math.round(grounding.dropRate * 100)}% drop rate).`}
              </p>
            )}
          </>
        ) : (
          <>
            {/* Issue #253: a procedurally generated "grounded read" used to sit
                here -- three pillars of claims, each with a tier chosen by
                arithmetic on a hash of the paper id, a quote from a five-item
                pool, a page number of (hash % 11) + 2, and a match score of
                0.92 + (hash % 8) / 100. Attached to real, checkable papers,
                that put sentences into AlphaFold and Attention Is All You Need
                that are not in them, under a standfirst promising every claim
                was bound to a quoted sentence from the source.

                Nothing stands in for it. A paper that has not been through the
                pipeline shows its real record and a link to the original,
                which is worth more than a convincing fake. */}
            <section className="mt-s-6 rounded-md border border-dashed border-border px-s-5 py-s-5">
              <h2 className="font-sans font-semibold text-[1.2rem] leading-snug text-ink">
                No grounded write-up yet
              </h2>
              <ArticleBody className="mt-s-3">
                <p>
                  This paper is catalogued but has not been through the verifier, so
                  there is nothing here we can show you a source sentence for. Rather
                  than generate a summary you would have to take on trust, which is
                  the exact thing Pepiros exists to avoid, the page stops here.
                </p>
                <p>
                  What is on this page is what we can actually stand behind: the
                  paper&rsquo;s own record, and a link to the original.
                </p>
              </ArticleBody>

              <dl className="mt-s-5 grid gap-s-3 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    Authors
                  </dt>
                  <dd className="mt-1 font-sans text-[15px] leading-relaxed text-ink">
                    {paper.authors.join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    Published in
                  </dt>
                  <dd className="mt-1 font-sans text-[15px] leading-relaxed text-ink">
                    {paper.venue}, {paper.year}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    Field
                  </dt>
                  <dd className="mt-1 font-sans text-[15px] leading-relaxed text-ink">
                    {paper.field}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    Access
                  </dt>
                  <dd className="mt-1 font-sans text-[15px] leading-relaxed text-ink">
                    {licenceLabel(paper.licence)}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}

        <ArticleRule />

        {/* Discussion */}
        <section>
          <div className="flex items-center gap-s-2">
            <MessageSquare className="size-4 text-ink-faint" strokeWidth={1.5} />
            <h2 className="font-sans font-semibold text-[1.45rem] leading-snug text-ink">
              Discussion
            </h2>
            <span className="font-mono text-[11px] text-ink-faint">
              {comments.length}
            </span>
          </div>

          {!post && (
            <p className="mt-s-2 font-sans text-[13px] italic text-ink-faint">
              Sample discussion, to show the format.
            </p>
          )}

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
