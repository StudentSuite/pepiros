import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { WalkthroughStep } from "@/components/site/WalkthroughStep";
import { ReaderMock, GraphMock, AgentMock } from "@/components/mockups/ReaderMock";
import { MAX_PAGES, MAX_UPLOAD_BYTES } from "@/lib/services/upload";

export const metadata: Metadata = {
  title: "How to use Pepiros",
  description:
    "Add a paper, read the graph, ask questions, and check every answer against the source. A practical walkthrough.",
};

/**
 * The practical guide.
 *
 * Distinct from /how-it-works on purpose: that page argues *why* the
 * verification is deterministic, for someone deciding whether to trust this.
 * This one is for someone who has already decided and wants to get something
 * done -- what to click, in what order, and what the screen will say back.
 *
 * Rebuilt onto the shared WalkthroughStep (issue #298): the same numbered
 * step, kicker, title, prose, media-slot shape /how-it-works uses, so a step
 * never looks different depending on which page describes it. Media is
 * omitted where no real mockup fits (steps 1, 4, 6) rather than padded with
 * an unrelated one.
 *
 * Every step describes behaviour that actually exists today. Where something
 * is not built, it says so in the step rather than being quietly omitted,
 * because a guide that describes a button you cannot find is worse than a
 * shorter guide.
 */
export default function HowToUsePage() {
  return (
    <main className="flex flex-col pb-s-5">
      <section className="mx-auto w-full max-w-[46rem] p-s-5">
        <p className="kicker">
          Guide
        </p>
        <h1 className="mt-s-3 font-sans font-bold text-[2.1rem] leading-tight text-ink">
          How to use Pepiros
        </h1>
        <p className="mt-s-4 font-sans text-[16px] leading-relaxed text-ink-muted">
          Seven steps, in the order you&rsquo;d actually do them. If you want
          the argument for why the checking works the way it does,{" "}
          <Link href="/how-it-works" className="text-accent-text underline underline-offset-2">
            how it works
          </Link>{" "}
          covers that instead.
        </p>

        <div className="mt-s-5 flex flex-wrap gap-s-3">
          <Link href="/w/ws-1" className={buttonClassName("primary")}>
            Open the demo workspace
          </Link>
          <Link href="/upload" className={buttonClassName("secondary")}>
            Add your own paper
          </Link>
        </div>
      </section>

      <WalkthroughStep index={1} title="Open a workspace">
        <p>
          A workspace holds a few papers and everything derived from them. The
          demo workspace is already populated with three papers on circadian
          rhythm and cognition, including a deliberate contradiction between two
          of them.
        </p>
        <p>
          You don&rsquo;t need an account to look around. Signing in is what
          makes your own work persist &mdash; without it, anything you add is
          gone when you close the tab.
        </p>
      </WalkthroughStep>

      <WalkthroughStep index={2} title="Read in the doc view first" tone="raised" media={<ReaderMock />}>
        <p>
          The default view is a reader, not the graph: summary at the top, the
          source PDF beside it, related papers on the right. Claims and their
          quotes sit next to each other so you can judge whether the quote
          actually supports the claim.
        </p>
        <p>
          Click any citation chip &mdash; the small monospace{" "}
          <span className="font-mono text-ink">C7</span>-style ids &mdash; to
          jump to the exact sentence it came from.
        </p>
      </WalkthroughStep>

      <WalkthroughStep index={3} title="Open the graph when you want structure" flip media={<GraphMock />}>
        <p>
          <strong className="text-ink">Explore graph</strong> switches to the
          canvas. Pillars start collapsed, so you see the shape of the argument
          before its details; click a pillar to expand its claims.
        </p>
        <p>
          If the colours and line styles don&rsquo;t mean anything to you yet,
          open <strong className="text-ink">What am I looking at?</strong> in
          the bottom-left. It only lists what that particular graph uses.
        </p>
        <p>
          Zoom out and cards deliberately shed detail: at a distance you are
          reading structure, not sentences.
        </p>
      </WalkthroughStep>

      <WalkthroughStep index={4} title="Ask a question" tone="raised">
        <p>
          The chat dock answers from the papers in the workspace and cites what
          it used. Every citation it returns is re-checked against the source
          after the answer is written, so a fabricated reference is reported as
          unsupported rather than passed off as evidence.
        </p>
        <p>
          If the papers genuinely don&rsquo;t cover your question, it says so
          instead of guessing. You can still ask it to answer without sources,
          and that answer is marked so it can never be mistaken for a grounded
          one.
        </p>
      </WalkthroughStep>

      <WalkthroughStep
        index={5}
        title="Check the grounding"
        media={
          <div className="flex flex-col gap-s-4 rounded-lg border border-border bg-surface-raised p-s-5">
            <div className="flex flex-col items-start gap-1.5">
              <EvidenceBadge tier="quote_located" />
              <RefChip refId="C7" />
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <EvidenceBadge tier="paraphrase" />
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <EvidenceBadge tier="unsupported" />
            </div>
          </div>
        }
      >
        <p>Every claim carries one of three badges, and the difference matters:</p>
        <ul className="flex flex-col gap-s-3">
          <li>
            <strong className="text-ink">Quote located</strong> &mdash; the
            quote was found in the source. This is <em>not</em> a statement
            that the claim follows from it, which is why the two render side
            by side.
          </li>
          <li>
            <strong className="text-ink">Paraphrase</strong> &mdash; close to
            the source wording, but not verbatim.
          </li>
          <li>
            <strong className="text-ink">Unsupported</strong> &mdash; the
            quote didn&rsquo;t match, so the anchor was dropped. Nothing in
            the app will show you this as evidence.
          </li>
        </ul>
        <p>
          The <strong className="text-ink">Audit</strong> view lists every
          claim in the workspace with its badge and a drop rate, which is the
          fastest way to see how well-grounded a workspace is overall.
        </p>
      </WalkthroughStep>

      <WalkthroughStep index={6} title="Add your own paper" tone="raised">
        <p>
          <strong className="text-ink">Add a paper</strong> takes a PDF or an
          arXiv / PMC / DOI link. It checks the file properly: that it really is
          a PDF, that it&rsquo;s within the limits (up to{" "}
          {MAX_UPLOAD_BYTES / (1024 * 1024)}MB and {MAX_PAGES} pages), that it
          has a text layer rather than being a scan, and that the workspace
          doesn&rsquo;t already have it.
        </p>
        <p>
          If something is wrong it tells you which thing, in those words.
        </p>
      </WalkthroughStep>

      <WalkthroughStep index={7} title="Call it from Claude" flip media={<AgentMock />}>
        <p>
          Pepiros also runs as an MCP server, so Claude can search the papers
          and check its own claims against them mid-conversation. Point Claude
          Code or Desktop at it, then ask Claude to summarise a paper and
          follow up with{" "}
          <em>&ldquo;now verify every claim you just made.&rdquo;</em>
        </p>
        <p>
          It calls <span className="font-mono text-ink">verify_claim</span> on
          its own sentences and reports which ones the source actually
          supports. Setup is in the{" "}
          <Link href="/mcp" className="text-accent-text underline underline-offset-2">
            agents guide
          </Link>
          .
        </p>
      </WalkthroughStep>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-3xl p-s-5">
          <div className="rounded-md border border-dashed border-border p-s-4">
            <h2 className="kicker">
              One thing worth repeating
            </h2>
            <p className="mt-s-2 font-sans text-[15px] leading-relaxed text-ink-muted">
              Nothing here is ever labelled <em>verified</em>. A matched quote
              proves the sentence exists in the paper; it doesn&rsquo;t prove the
              claim built on it is true. Pepiros does the part a machine can do
              reliably, and puts the claim and its quote next to each other so you
              can do the part it can&rsquo;t.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
