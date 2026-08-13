import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { PillarChip } from "@/components/ui/PillarChip";
import { Reveal } from "@/components/ui/Reveal";
import { getMockPaperBySlug, topicLabelForPillar, formatMockDate, type MockPaper } from "@/lib/mock/discover";
import { mockSession } from "@/lib/mock/session";
import { PaperEngagement } from "./PaperEngagement";

// Structural "pillar" summaries -- mirrors fixtures/workspace.json's own
// pattern (a paper's Methods/Key Finding/etc nodes each carry their own
// pillarIndex for color, independent of the paper's own topic pillarIndex
// used on the header badge and the discover card). Mock/illustrative, not
// per-paper generated content, per the Task 6 brief.
function buildPillarSummaries(paper: MockPaper) {
  return [
    {
      title: "Methods",
      pillarIndex: 1,
      body: "How the study was designed and run, condensed to the parts a reader needs before trusting the results.",
    },
    {
      title: "Key finding",
      pillarIndex: 2,
      body: `The headline result of "${paper.title}," stated plainly and ready to be traced back to its source quote.`,
    },
    {
      title: "Limitations",
      pillarIndex: 5,
      body: "What the paper itself flags as open questions, caveats, or scope it doesn't cover.",
    },
  ] as const;
}

// Discussion thread -- mock array of 3-4 comments, no real threading (Task
// 6 brief). Shared across every paper on purpose: this build has no real
// per-paper comment backing yet.
const DISCUSSION = [
  {
    author: "Priya S.",
    text: "The methods section is worth a close read before citing the headline number, the sample is small relative to the effect size claimed.",
    timestamp: "2 days ago",
  },
  {
    author: "jonasw",
    text: "Anyone traced the key finding back to the actual source sentence yet? Curious if it holds up as quote located or drops to inference.",
    timestamp: "4 days ago",
  },
  {
    author: "Hana K.",
    text: "Useful companion to a couple of other papers in my workspace. Following for updates.",
    timestamp: "1 week ago",
  },
  {
    author: "reviewer_anon",
    text: "Limitations section undersells the confound here, worth flagging if you're building on this.",
    timestamp: "2 weeks ago",
  },
] as const;

function buildSummary(paper: MockPaper): string {
  const topic = topicLabelForPillar(paper.pillarIndex).toLowerCase();
  return `A public-safe overview of "${paper.title}." This summary surfaces what the paper claims in ${topic} and why it's worth reading, without exposing any workspace-private notes or annotations tied to it. Open the full graph to see every claim traced back to its exact source quote.`;
}

/**
 * `/paper/[slug]` -- public paper detail. Server Component: reads the mock
 * catalog by slug and calls notFound() before anything renders (Next's
 * not-found convention, exercised here per the Task 6 brief even though
 * Task 13's app/not-found.tsx may not have landed yet -- Next's default 404
 * still handles it). Only the follow/like controls are a client boundary,
 * see PaperEngagement.tsx. Header/footer come from app/(platform)/layout.tsx.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const paper = getMockPaperBySlug(slug);
  if (!paper) {
    return { title: "Paper not found" };
  }
  const byline = `${paper.authors.join(", ")}${paper.venue ? ` -- ${paper.venue}` : ""}`;
  return {
    title: paper.title,
    description: `${byline}. Read with every claim traced to its source quote on Pepiros.`,
  };
}

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paper = getMockPaperBySlug(slug);
  if (!paper) {
    notFound();
  }

  const pillarSummaries = buildPillarSummaries(paper);
  // The one place in this task that branches on mock session state: signed
  // out sends a visitor to sign in first, signed in drops them straight into
  // the demo workspace (there's no real per-paper workspace yet).
  const graphHref = mockSession ? "/workspaces" : "/login";

  return (
    <main className="flex flex-col">
      {/* Header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-10 pt-20 sm:pt-28">
        <div className="flex flex-wrap items-center gap-2">
          <PillarChip pillarIndex={paper.pillarIndex} label={topicLabelForPillar(paper.pillarIndex)} />
          {paper.openAccess ? (
            <Badge dotClassName="bg-accent" className="text-ink-muted">
              Open access
            </Badge>
          ) : (
            <Badge className="border-dashed text-ink-faint">Author-published</Badge>
          )}
        </div>

        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">{paper.title}</h1>

        <p className="font-mono text-xs text-ink-faint">
          {paper.authors.join(", ")}
          {paper.venue ? ` · ${paper.venue}` : ""} · {formatMockDate(paper.publishedDate)}
        </p>

        <PaperEngagement initialLikeCount={paper.likeCount} />
      </section>

      {/* Public-safe summary, reading surface. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Summary</p>
            <div className="surface-reading paper-grain mt-4 rounded-lg p-s-6">
              <p className="font-serif text-base leading-relaxed text-[#1c1a15]">
                {buildSummary(paper)}
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Pillar summaries. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Pillars</p>
            <h2 className="mt-2 font-serif text-2xl text-ink">What the graph pulls out</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {pillarSummaries.map((summary) => (
                <div
                  key={summary.title}
                  className="flex flex-col gap-2 rounded border border-border bg-surface-raised p-4"
                >
                  <PillarChip pillarIndex={summary.pillarIndex} label={summary.title} />
                  <p className="font-sans text-sm leading-relaxed text-ink-muted">{summary.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Discussion thread. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-faint">
              <Icon icon={MessageCircle} size="xs" />
              Discussion &middot; {DISCUSSION.length}
            </p>
            <div className="mt-6 flex flex-col gap-4">
              {DISCUSSION.map((comment) => (
                <div
                  key={`${comment.author}-${comment.timestamp}`}
                  className="rounded border border-border bg-surface-raised p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-sans text-sm font-medium text-ink">{comment.author}</p>
                    <p className="font-mono text-[10px] text-ink-faint">{comment.timestamp}</p>
                  </div>
                  <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-muted">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* CTA -- session-aware. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-16">
            <p className="max-w-md font-sans text-sm text-ink-muted">
              The full graph traces every claim on this paper back to its exact source quote, plus
              generators and the canvas view.
            </p>
            <Link href={graphHref} className={buttonClassName("primary")}>
              Open full graph
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
