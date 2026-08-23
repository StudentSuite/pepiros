import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleBody,
  ArticleHeader,
  ReadingColumn,
} from "@/components/reading/Article";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the people building Pepiros.",
};

export default function ContactPage() {
  return (
    <main className="pb-s-5">
      <ArticleHeader
        banded
        kicker="Contact"
        title="There is no support desk."
        dek="Two people build this. Here is where each kind of message actually goes."
      />

      <ReadingColumn className="pt-s-6">
        <ArticleBody>
          <p>
            Pepiros is built by Anay Dhawan and Yash Kewlani. There is no
            dedicated inbox yet, and inventing one would be worse than saying so.
          </p>

          <h2>A bug, or a feature request</h2>
          <p>
            Open an issue on{" "}
            <a
              href="https://github.com/StudentSuite/pepiros/issues"
              target="_blank"
              rel="noreferrer noopener"
            >
              the repository
            </a>
            . That is where the work is tracked, so it is the one route that
            will not get lost.
          </p>

          <h2>A security problem</h2>
          <p>
            Please do not open a public issue. The disclosure process is on the{" "}
            <Link href="/security">security page</Link>, which explains what to
            include and what to expect back.
          </p>

          <h2>Anything else</h2>
          <p>
            Discussions on the repository are open, and are read. Response times
            are honest rather than fast: this is a side project, built around
            other commitments.
          </p>
        </ArticleBody>
      </ReadingColumn>
    </main>
  );
}
