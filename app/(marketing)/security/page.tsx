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
      updated="15 August 2026"
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
      </Section>

      <Section title="Current posture, stated honestly">
        <p>
          Sessions are signed HTTP-only cookies. Protected routes are enforced in
          middleware, not only hidden from search engines. MCP tokens are
          scoped and revocable.
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
