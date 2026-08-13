import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { Reveal } from "@/components/ui/Reveal";
import { PacingStrip } from "@/components/site/PacingStrip";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Deterministic verification, not a model's opinion of itself. Every claim is checked against the exact source sentence with a fuzzy-match score.",
};

// Worked example -- the same C7 circadian-light claim/quote already
// established by VerificationDemo and the home page's grounding trust band
// (components/site/VerificationDemo.tsx, app/(marketing)/page.tsx), reused
// here on purpose for continuity rather than inventing a second illustrative
// example. The score and the two threshold values are the real numbers from
// plan.md §4 / docs/PLAN-V1.md §4.4: token_set_ratio >= 0.92 -> quote_located,
// >= 0.75 -> paraphrase, else the anchor is dropped.
const WORKED_CLAIM =
  "Morning bright light advances circadian phase by about 1.4 hours in shift workers.";
const WORKED_QUOTE =
  "Participants receiving 30 minutes of 10,000 lux morning light advanced dim-light melatonin onset by 1.4 hours (95% CI 0.9–1.9) after five days.";
const WORKED_SCORE = 0.97;

// Honest-limitations list -- plan.md §4's honest-framing paragraph ("this
// goes in the pitch verbatim"), plus docs/PLAN-V1.md §4.4's fuller bullet
// form of the same paragraph. Quoted for its actual point, not softened.
const LIMITATIONS = [
  "A fuzzy-matched quote proves quotation provenance, not entailment.",
  "A model can attach a real Methods sentence to a wrong conclusion and still score 1.0 on the match.",
  "The badge always reads quote located, and never reads verified.",
  "Claim and quote render adjacent on purpose, so the reader adjudicates entailment, not the matcher.",
] as const;

/**
 * `/how-it-works` -- the deterministic-verification pitch, unpacked. Header
 * -> full pacing strip -> a worked scoring example with the real thresholds
 * as a labeled scale -> the two-tier badge explainer -> the entailment-floor
 * paragraph -> the honest-limitations list -> CTA row. Header/footer come
 * from app/(marketing)/layout.tsx.
 */
export default function HowItWorksPage() {
  return (
    <main className="flex flex-col">
      {/* Banner header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-14 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          How it works
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">
          Deterministic verification, not a model&apos;s opinion of itself.
        </h1>
        <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
          Every claim is checked against the exact source sentence with a fuzzy-match score, not
          asked of a language model a second time.
        </p>
      </section>

      {/* Pacing strip, full detail -- plan.md §1. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="mb-6 font-mono text-xs uppercase tracking-widest text-ink-faint">
              What happens when you upload
            </p>
            <PacingStrip variant="full" />
          </div>
        </section>
      </Reveal>

      {/* Worked verification example -- threshold scale/bar, plan.md §4. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Worked example
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">One claim, scored</h2>

            <div className="surface-reading paper-grain mt-6 rounded-lg p-s-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-serif text-base leading-snug text-[#1c1a15]">{WORKED_CLAIM}</p>
                <RefChip refId="C7" />
              </div>

              <div className="mt-4 rounded border border-black/10 bg-paper-muted p-s-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#1c1a15]/50">
                  Source excerpt
                </p>
                <p className="mt-1 font-serif text-sm leading-relaxed text-[#1c1a15]">
                  {WORKED_QUOTE}
                </p>
              </div>

              {/* token_set_ratio(normalize(quote), normalize(chunk.text)), plan.md
                  §4: >= 0.92 quote_located, >= 0.75 paraphrase, else dropped. */}
              <div className="mt-6">
                <div className="relative h-2 w-full rounded-full bg-black/10">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 rounded-l-full bg-unsupported/50"
                    style={{ width: "75%" }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 bg-paraphrase/60"
                    style={{ left: "75%", width: "17%" }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 rounded-r-full bg-located/60"
                    style={{ left: "92%", width: "8%" }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1c1a15] bg-white"
                    style={{ left: `${WORKED_SCORE * 100}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[#1c1a15]/50">
                  <span>0.0 dropped</span>
                  <span>0.75 paraphrase</span>
                  <span>0.92 quote located</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <EvidenceBadge tier="quote_located" className="!text-[#1c1a15]" />
                <span className="font-mono text-xs text-[#1c1a15]/60">
                  score {WORKED_SCORE.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Two-tier badge explainer. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Two tiers, always labeled
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">Quote located vs. inference</h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded border border-border bg-surface-raised p-4">
                <EvidenceBadge tier="quote_located" />
                <p className="font-sans text-sm leading-relaxed text-ink-muted">
                  Deterministic: the fuzzy-match score cleared 0.92 against a real chunk of the
                  source text. Page and quote are both shown.
                </p>
              </div>
              <div className="flex flex-col gap-3 rounded border border-border bg-surface-raised p-4">
                <Badge dotClassName="bg-inference" className="text-ink-muted">
                  inference
                </Badge>
                <p className="font-sans text-sm leading-relaxed text-ink-muted">
                  Model-generated: no source excerpt has been checked yet. No citation, no quote,
                  until it runs back through the verifier.
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-2xl font-sans text-sm leading-relaxed text-ink-muted">
              Plus an entailment overlap floor: every number, unit, and comparator in a claim also
              has to appear in the anchored span, checked against the numeric ledger. That catches
              the failure a fuzzy match alone misses, a genuine quote attached to a reversed or
              overstated conclusion.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Honest limitations -- plan.md §4's honest-framing paragraph, unsoftened. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Said on stage, not just in the docs
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">What this doesn&apos;t prove</h2>
            <ul className="mt-6 flex flex-col gap-3">
              {LIMITATIONS.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 font-sans text-sm leading-relaxed text-ink-muted"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* CTA row. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-6 py-16">
            <Link href="/mcp" className={buttonClassName("primary")}>
              See the MCP tools
            </Link>
            <Link href="/workspaces" className={buttonClassName("secondary")}>
              Try the demo workspace
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
