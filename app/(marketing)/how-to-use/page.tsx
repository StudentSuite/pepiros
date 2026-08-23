import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";

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
 * Every step describes behaviour that actually exists today. Where something
 * is not built, it says so in the step rather than being quietly omitted,
 * because a guide that describes a button you cannot find is worse than a
 * shorter guide.
 */

interface Step {
  n: number;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "Open a workspace",
    body: (
      <>
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
      </>
    ),
  },
  {
    n: 2,
    title: "Read in the doc view first",
    body: (
      <>
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
      </>
    ),
  },
  {
    n: 3,
    title: "Open the graph when you want structure",
    body: (
      <>
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
      </>
    ),
  },
  {
    n: 4,
    title: "Ask a question",
    body: (
      <>
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
      </>
    ),
  },
  {
    n: 5,
    title: "Check the grounding",
    body: (
      <>
        <p>Every claim carries one of three badges, and the difference matters:</p>
        <ul className="mt-s-3 flex flex-col gap-s-3">
          <li className="flex flex-col items-start gap-1.5">
            <EvidenceBadge tier="quote_located" />
            <span>
              The quote was found in the source. This is <em>not</em> a
              statement that the claim follows from it &mdash; that judgement is
              yours, which is why the two render side by side.
            </span>
          </li>
          <li className="flex flex-col items-start gap-1.5">
            <EvidenceBadge tier="paraphrase" />
            <span>Close to the source wording, but not verbatim.</span>
          </li>
          <li className="flex flex-col items-start gap-1.5">
            <EvidenceBadge tier="unsupported" />
            <span>
              The quote didn&rsquo;t match, so the anchor was dropped. Nothing
              in the app will show you this as evidence.
            </span>
          </li>
        </ul>
        <p className="mt-s-3">
          The <strong className="text-ink">Audit</strong> view lists every
          claim in the workspace with its badge and a drop rate, which is the
          fastest way to see how well-grounded a workspace is overall.
        </p>
      </>
    ),
  },
  {
    n: 6,
    title: "Add your own paper",
    body: (
      <>
        <p>
          <strong className="text-ink">Add a paper</strong> takes a PDF or an
          arXiv / PMC / DOI link. It checks the file properly: that it really is
          a PDF, that it&rsquo;s within the size and page limits, that it has a
          text layer rather than being a scan, and that the workspace
          doesn&rsquo;t already have it.
        </p>
        <p>
          If something is wrong it tells you which thing, in those words. Note
          that parsing an accepted paper into a graph is the next piece of work
          &mdash; today the file is validated and queued, not yet analysed.
        </p>
      </>
    ),
  },
  {
    n: 7,
    title: "Call it from Claude",
    body: (
      <>
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
      </>
    ),
  },
];

export default function HowToUsePage() {
  return (
    <main className="pb-s-5">
      <div className="mx-auto w-full max-w-[46rem] px-s-5">
        <header className="py-s-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Guide
          </p>
          <h1 className="mt-s-3 font-sans font-bold text-[2.1rem] leading-tight text-ink">
            How to use Pepiros
          </h1>
          <p className="mt-s-4 font-sans text-[16px] leading-relaxed text-ink-muted">
            Seven steps, in the order you&rsquo;d actually do them. If you want
            the argument for why the checking works the way it does,{" "}
            <Link
              href="/how-it-works"
              className="text-accent-text underline underline-offset-2"
            >
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
        </header>

        <ol className="flex flex-col gap-s-6 border-t border-border pt-s-6">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-s-4">
              <span
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[11px] text-ink-muted"
              >
                {step.n}
              </span>
              <div className="min-w-0">
                <h2 className="font-sans text-[17px] font-semibold text-ink">
                  {step.title}
                </h2>
                <div className="mt-s-2 flex flex-col gap-s-2 font-sans text-[15px] leading-relaxed text-ink-muted">
                  {step.body}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-s-7 rounded-md border border-dashed border-border p-s-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            One thing worth repeating
          </h2>
          <p className="mt-s-2 font-sans text-[15px] leading-relaxed text-ink-muted">
            Nothing here is ever labelled <em>verified</em>. A matched quote
            proves the sentence exists in the paper; it doesn&rsquo;t prove the
            claim built on it is true. Pepiros does the part a machine can do
            reliably, and puts the claim and its quote next to each other so you
            can do the part it can&rsquo;t.
          </p>
        </section>
      </div>
    </main>
  );
}
