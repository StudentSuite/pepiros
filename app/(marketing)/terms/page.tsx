import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms you accept by using Pepiros, stated plainly.",
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms"
      title="Terms of use"
      intro="Short, because the product is small and the honest version fits on one page."
      updated="15 August 2026"
    >
      <Section title="What Pepiros is">
        <p>
          A research prototype that checks whether a generated claim quotes its
          source. It is not a certified, clinically validated, or professionally
          reviewed tool, and nothing it produces is medical, legal, or clinical
          advice.
        </p>
        <p>
          A &ldquo;quote located&rdquo; badge means the cited sentence exists at the
          stated page in the source. It is not a claim that the underlying
          research is correct, current, or complete.
        </p>
      </Section>

      <Section title="What you upload">
        <p>
          You keep whatever rights you already had. By uploading, you confirm you
          are allowed to do so and that you will not publish anything into the
          public library whose licence does not permit it.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not use Pepiros to fabricate provenance for a claim, to
          misrepresent what a paper says, or to present model output as verified
          research. That is the specific failure this project exists to make
          harder.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          We offer no uptime guarantee. Features can change or
          disappear. See <Link href="/status" className="text-accent-text underline underline-offset-2">status</Link>{" "}
          for what is working right now.
        </p>
      </Section>

      <Section title="Licence">
        <p>
          The code is MIT licensed. Full text on the{" "}
          <Link href="/legal" className="text-accent-text underline underline-offset-2">
            legal page
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
