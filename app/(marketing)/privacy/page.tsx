import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Pepiros stores, what it does not, and who can see the papers you upload.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Privacy"
      title="What we store, and what we do not"
      intro="Pepiros is a small, early build. This page describes what it actually does today rather than what a mature product might do."
      updated="15 August 2026"
    >
      <Section title="Papers you upload">
        <p>
          A paper you upload stays private to your own workspace. It is not added
          to the public library, and it is not shown to other readers, unless its
          licence permits republication and you publish it yourself.
        </p>
        <p>
          The public library contains open-access and CC-licensed work only.
        </p>
      </Section>

      <Section title="Account data">
        <p>
          If you create an account we store your username, display name, bio, and
          the answers you gave during onboarding. Onboarding answers are visible
          only to you and are used to decide what your home page surfaces first.
        </p>
        <p>
          The guest demo account stores nothing. Everything it shows is generated,
          and nothing you do inside it is written anywhere.
        </p>
      </Section>

      <Section title="Third parties">
        <p>
          Pepiros calls Semantic Scholar to populate the related-papers rail and
          OpenAlex to expand a citation graph. Both receive the identifier of the
          paper being looked up. Neither receives your account details.
        </p>
        <p>
          Grounded chat sends the text of your question and the relevant source
          excerpts to a language-model provider. It does not send your identity.
        </p>
      </Section>

      <Section title="Analytics">
        <p>
          There is no third-party analytics or advertising script on this site.
          The reach figures on your own dashboard are counted server-side and are
          visible only to you.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Privacy questions go to the same place as everything else: open an
          issue on the repository. For anything sensitive, follow the
          disclosure process on <Link href="/security">the security page</Link>{" "}
          instead of a normal issue.
        </p>
      </Section>
    </LegalPage>
  );
}
