import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LegalPage } from "@/components/site/LegalPage";
import { MAX_PAGES, MAX_UPLOAD_BYTES } from "@/lib/services/upload";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about how Pepiros checks claims, what the badges mean, and what it does not prove.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Does Pepiros fact-check papers?",
    a: (
      <>
        No, and the distinction matters. Pepiros checks whether a generated claim
        actually quotes the source it cites. That is quotation provenance. It says
        nothing about whether the paper is right, current, or well designed.
      </>
    ),
  },
  {
    q: "Why does the badge never say “verified”?",
    a: (
      <>
        Because a fuzzy match proves quotation, not entailment. A model can attach
        a genuine sentence from the Methods section to a conclusion the paper
        never draws and still score a perfect match. &ldquo;Quote located&rdquo; is
        the strongest thing the check can honestly support.
      </>
    ),
  },
  {
    q: "What is the difference between quote located, paraphrase, and inference?",
    a: (
      <>
        A claim scoring 0.92 or above against the source text is badged{" "}
        <strong className="text-ink">quote located</strong>. Between 0.75 and 0.92
        it is <strong className="text-ink">paraphrase</strong>. Below that the
        anchor is dropped entirely. A claim with no checked excerpt at all is
        badged <strong className="text-ink">inference</strong>, meaning the model
        wrote it and nothing has been checked yet.
      </>
    ),
  },
  {
    q: "What is the entailment overlap floor?",
    a: (
      <>
        An extra check on top of the fuzzy match. Every number, unit, and
        comparator in a claim has to appear in the anchored span too. It catches
        the failure a text match alone misses: a real quote attached to a reversed
        or inflated conclusion.
      </>
    ),
  },
  {
    q: "Can I connect my own AI agent?",
    a: (
      <>
        Yes, over MCP. All 12 tools are live today, including{" "}
        <code className="font-mono text-xs text-ink">verify_claim</code>, which
        lets an agent check its own output mid-conversation. See{" "}
        <Link href="/mcp" className="text-accent-text underline underline-offset-2">
          the MCP page
        </Link>
        .
      </>
    ),
  },
  {
    q: "Do my uploaded papers become public?",
    a: (
      <>
        No. An uploaded paper stays private to your workspace. The public library
        only ever contains open-access and CC-licensed work.
      </>
    ),
  },
  {
    q: "What can I upload?",
    a: (
      <>
        A PDF, up to {MAX_UPLOAD_BYTES / (1024 * 1024)}MB and {MAX_PAGES}{" "}
        pages. A file outside either limit, or one with no extractable text
        (a scanned image with no OCR pass yet), is rejected with the actual
        reason named rather than a generic upload failure.
      </>
    ),
  },
  {
    q: "Can I try it without signing up?",
    a: (
      <>
        Yes. Sign in as <code className="font-mono text-xs text-ink">guest</code> /{" "}
        <code className="font-mono text-xs text-ink">guest</code> for a fully
        populated demo account. Nothing you do there is saved.
      </>
    ),
  },
  {
    q: "How finished is this?",
    a: (
      <>
        Partly, by design rather than by accident: 7 areas are fully live, 5
        are partly built and say so on their own page rather than pretending
        otherwise. The{" "}
        <Link href="/status" className="text-accent-text underline underline-offset-2">
          status page
        </Link>{" "}
        lists exactly which is which.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <LegalPage
      kicker="FAQ"
      title="Questions people actually ask"
      intro="Mostly about what the badges mean and what this does not claim to do."
    >
      {/* Native details/summary rather than a JS accordion: it is keyboard and
          screen-reader correct for free, it works before hydration, and the
          browser's own in-page search can still find collapsed answers. */}
      <div className="divide-y divide-border border-y border-border">
        {FAQS.map((f, i) => (
          <details key={i} className="group py-s-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-s-4 font-sans text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <ChevronDown
                className="size-4 shrink-0 text-ink-faint transition-transform duration-fast ease-out group-open:rotate-180"
                strokeWidth={1.5}
              />
            </summary>
            <div className="mt-s-3 font-sans text-sm leading-relaxed text-ink-muted">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </LegalPage>
  );
}
