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
      intro="This page describes what Pepiros actually does today, not aspirational policy."
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
          the answers you gave during onboarding.
        </p>
        {/* Issue #237: this section used to say onboarding answers were
            "visible only to you." That stopped being true the moment
            /admin/onboarding existed, and a privacy page that is quietly wrong
            about who can read your words is worse than one that never
            mentioned it. Landed in the same change as the admin route, not
            after it. */}
        <p>
          <strong className="text-ink">Who can read your onboarding answers.</strong>{" "}
          A Pepiros administrator can read them, including the free-text ones:
          what an AI summary got wrong for you, how you check a claim today, what
          you actually work on, and what would make you use this weekly. They are
          read to work out which problems are real and what to build next. They
          are not sold, not shared with third parties, and not published.
        </p>
        <p>
          <strong className="text-ink">Email contact is opt-in.</strong> The
          checkbox on the last onboarding step is off unless you tick it, and we
          do not email you about your reading unless you do. To withdraw it,
          untick the box (the wizard is resumable at any time) or email us and we
          will clear it, along with any free-text answers you would rather we did
          not keep.
        </p>
        <p>
          Everything else you answered is segmentation (role, field, intent,
          experience, referral, country) and decides what your home page surfaces
          first.
        </p>
        <p>
          The guest demo account stores nothing. Everything it shows is generated,
          and nothing you do inside it is written anywhere.
        </p>
        <p>
          A signed-in session lasts 7 days and does not silently renew. Signing
          out, or signing out everywhere in settings, revokes it immediately
          rather than leaving it valid until it expires on its own.
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
