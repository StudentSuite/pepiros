import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleBody,
  ArticleHeader,
  ArticleRule,
  ReadingColumn,
} from "@/components/reading/Article";

export const metadata: Metadata = {
  title: "About",
  description:
    "Pepiros binds every AI-surfaced claim to the exact quoted sentence it came from, checked deterministically rather than asserted.",
};

export default function AboutPage() {
  return (
    <main className="pb-s-8">
      <ReadingColumn>
        <ArticleHeader
          kicker="About"
          title="A grounding engine for research reading."
          dek="Every claim stays bound to the sentence it came from, or says plainly that it has none."
        />

        <ArticleBody>
          <p>
            Most tools that summarise a paper ask you to trust the summary. The
            model produces confident prose, the prose sounds like the paper, and
            the only way to know whether it is right is to go and read the paper
            yourself, which is the work you were trying to avoid.
          </p>
          <p>
            Pepiros takes the opposite position. Every claim it surfaces is
            matched against the exact sentence it cites, with a score you can
            see. Claims that clear the threshold show their quote, their page,
            and their citation id. Claims that do not are labelled{" "}
            <strong>inference</strong> and get no citation at all.
          </p>

          <h2>Why the badge never says &ldquo;verified&rdquo;</h2>
          <p>
            A fuzzy-matched quote proves quotation provenance. It does not prove
            entailment. A model can attach a real sentence from the Methods
            section to a conclusion that sentence does not support, and still
            score a perfect match.
          </p>
          <p>
            So the badge reads <strong>quote located</strong>, never{" "}
            <strong>verified</strong>, and the claim and its quote render next to
            each other rather than one behind the other. The reader adjudicates
            whether the claim follows. The matcher only establishes that the
            sentence is really there, at that page, in that paper.
          </p>
          <p>
            An entailment overlap floor helps at the margins: every number, unit
            and comparator in a claim also has to appear in the anchored span.
            That catches the failure a fuzzy match alone misses, a genuine quote
            attached to a reversed or overstated conclusion. It is a floor, not a
            guarantee, and it is described that way on{" "}
            <Link href="/how-it-works">how it works</Link>.
          </p>

          <h2>Built as a service, not just a site</h2>
          <p>
            The same grounding is callable over MCP, so an agent can check its
            own claims against a source before asserting them to you, and say so
            out loud when one comes back unsupported. That is the part we think
            is genuinely new, and it is documented on{" "}
            <Link href="/mcp">the agents page</Link>.
          </p>

          <ArticleRule />

          <h2>Who builds it</h2>
          <p>
            Pepiros is built by Anay Dhawan and Yash Kewlani, under the{" "}
            <a
              href="https://github.com/StudentSuite"
              target="_blank"
              rel="noreferrer noopener"
            >
              StudentSuite
            </a>{" "}
            org. It started as a hackathon project and is still an early build,
            moving quickly. The <Link href="/roadmap">roadmap</Link> says what is
            real today and what is not, without rounding up.
          </p>
        </ArticleBody>
      </ReadingColumn>
    </main>
  );
}
