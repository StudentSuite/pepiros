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
    "Every claim Pepiros surfaces is checked against the exact sentence it cites, with a score you can see.",
};

export default function AboutPage() {
  return (
    <main className="pb-s-8">
      <ReadingColumn>
        <ArticleHeader
          kicker="About"
          title="Turns a research PDF into a living knowledge graph."
          dek="Every generated claim is bound to a located quote, exposed to Claude as an MCP service."
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
            A matched quote tells you the sentence is real. It doesn&apos;t tell
            you the conclusion built on it is right. A model can quote the
            Methods section correctly and still draw the wrong conclusion from
            it.
          </p>
          <p>
            That&apos;s why the badge stops at <strong>quote located</strong> and
            never says <strong>verified</strong>. Claim and quote sit side by
            side so you can judge whether the claim actually follows, not so
            Pepiros can tell you it already checked that part for you.
          </p>
          <p>
            An entailment overlap floor catches the sharper failure, a real
            quote attached to a reversed or overstated conclusion. It&apos;s a
            floor, not a guarantee; the mechanics are on{" "}
            <Link href="/how-it-works">how it works</Link>.
          </p>

          <h2>Also live as an MCP service</h2>
          <p>
            The same grounding is callable over MCP, so an agent can check its
            own claims against a source before asserting them to you, and say so
            when one comes back unsupported. Documented on{" "}
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
