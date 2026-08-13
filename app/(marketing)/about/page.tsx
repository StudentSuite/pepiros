import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";

export const metadata: Metadata = {
  title: "About",
  description:
    "Pepiros is built by Anay Dhawan and Yash Kewlani -- a grounding engine for research reading, built as an MCP server so any AI agent can verify its own claims against a source.",
};

// Team credit -- LICENSE ("Copyright (c) 2026 Anay Dhawan and Yash
// Kewlani") and CONTRIBUTING.md's "Maintained by Anay Dhawan". No
// biographical detail invented beyond those two sources.
const TEAM = "Anay Dhawan and Yash Kewlani";

/**
 * `/about` -- what Pepiros does, why grounding is the whole point, and org
 * credit. No build-origin narrative here (2026-08-13 direction: this page
 * covers product + org, not how/when it was built). A placeholder stands
 * in for a GitHub link: the repo is private through submission (project
 * context), so a real github.com/StudentSuite/pepiros URL here would just
 * point at something a visitor can't reach. The org link below points at
 * the StudentSuite org root instead, which doesn't leak the private repo.
 * Header banner -> what it does -> org -> repo status. Header/footer come
 * from app/(marketing)/layout.tsx.
 */
export default function AboutPage() {
  return (
    <main className="flex flex-col">
      {/* Banner header. Not wrapped in Reveal -- first thing on screen.
          Headline is this page's own <meta> description, promoted to H1.
          Body paragraph bumped to text-base/text-ink (matches the home
          hero's own anchor paragraph) so one paragraph per page reads as
          the deliberate lead-in, rest of the page stays text-sm. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-14 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          About
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
          A grounding engine for research reading.
        </h1>
        <p className="max-w-xl font-sans text-base leading-relaxed text-ink-muted">
          Every AI-surfaced claim stays bound to the exact quoted sentence it
          came from, checked deterministically instead of just asserted, and
          callable mid-conversation from Codex, Claude, or Cursor over MCP.
        </p>
      </section>

      {/* Why grounding -- plan.md §4's honest-framing paragraph, in the
          project's own voice here rather than reused verbatim from the home
          page / how-it-works, same substance: a fuzzy match proves
          quotation, not entailment. Badge + ref chip render for real below
          the paragraph now (review finding, 2026-08-13: this section used
          to describe "the badge" without ever showing one) -- same C7
          illustrative example the home page and the "For agents" band
          already use, not a new one. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Why grounding
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">
              Why this exists at all
            </h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              A fuzzy-matched quote proves quotation, not entailment. A model
              can attach a real Methods sentence to a wrong conclusion and still
              score a perfect match. That&apos;s why the badge always reads
              quote located and never verified, and why claim and quote render
              side by side so a reader adjudicates it themselves instead of
              taking a model&apos;s word for it.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <EvidenceBadge tier="quote_located" />
              <RefChip refId="C7" />
              <span className="font-sans text-xs text-ink-faint">
                what that badge looks like, on a real claim
              </span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Org -- package.json's repository field + CHANGELOG's "Repo
          transferred to the StudentSuite org" entry. Links the org root,
          not the repo, for the same private-repo reasoning as the repo
          status section below. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Org
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">
              Part of StudentSuite
            </h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Pepiros is built and maintained by {TEAM}, under the{" "}
              <a
                href="https://github.com/StudentSuite"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-border-strong underline-offset-2 hover:decoration-ink"
              >
                StudentSuite
              </a>{" "}
              org.
            </p>

            {/* Repo status folded into the same section as Org, not its own
                border-t block (review finding, 2026-08-13: two short,
                unrelated-looking sections back to back each reserving a
                full py-14/py-16 read as a large dead gap once actually
                rendered -- these two are both "where to find this" content
                anyway). No GitHub link: plain muted text instead of a
                button-shaped disabled pill (opacity-40 button next to the
                primary CTA read as equally weighted / broken-looking
                rather than clearly secondary), and it can't 404 or imply
                the repo is public already. Primary CTA leads. */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/how-it-works"
                className={buttonClassName("primary", "sm")}
              >
                See how verification works
              </Link>
              <span className="font-sans text-xs text-ink-faint">
                GitHub: coming at public launch
              </span>
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
