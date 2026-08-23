import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How to report a vulnerability in Pepiros, and what the current security posture actually is.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      kicker="Security"
      title="Reporting a vulnerability"
      intro="If you have found something, we would rather hear it from you than from someone else."
      updated="24 August 2026"
    >
      <Section title="How to report">
        <p>
          Open a private security advisory on the repository. If you cannot,
          open a normal issue that says only that you have found a security
          problem and how to reach you, with no details in the public thread.
        </p>
        <p>
          Please give us a reasonable window to fix an issue before publishing it.
        </p>
      </Section>

      <Section title="What is in scope">
        <p>
          Anything that lets one account read or change another account&rsquo;s
          data, anything that lets an unauthenticated request reach a protected
          route, and anything that causes Pepiros to attribute a quote to a
          source it did not come from.
        </p>
        <p>
          That last one matters as much as the first two here. A grounding tool
          that can be made to point at the wrong sentence has failed at the only
          thing it claims to do.
        </p>
        <p>
          Also in scope: anything that gets past upload validation itself --
          a spoofed file type, an oversized payload, or a page count that
          slips through uncounted before it reaches the parser.
        </p>
      </Section>

      <Section title="Current posture, stated honestly">
        <p>
          Sessions are signed HTTP-only cookies with a 7-day lifetime and no
          silent renewal, and are server-side revocable: signing out, or
          signing out everywhere, actually kills the session rather than
          just clearing a cookie the server would still honor. Protected
          routes are enforced in middleware, not only hidden from search
          engines.
        </p>
        <p>
          An MCP token carries its own scope (read-only, or read and write),
          can be pinned to a single workspace rather than every workspace an
          account owns, and can be revoked independently of the account
          session that minted it.
        </p>
        <p>
          The verifier and its thresholds -- the thing this page&rsquo;s own
          &ldquo;what is in scope&rdquo; section leads with -- are covered by
          five dedicated test files (anchor location, fuzzy matching, numeric
          entailment, reverse audit, tier assignment), not just code review.
        </p>
        <p>
          There is no bug bounty, no formal SLA, and no third-party audit. This
          is a two-person project, and pretending otherwise would be its own kind
          of security problem.
        </p>
      </Section>
    </LegalPage>
  );
}
