import { cn } from "@/lib/utils";
import type { Claim } from "@/lib/data/paperContent";

/**
 * A claim, with its grounding shown inline.
 *
 * This is the component the whole product argues for, so two rules are
 * non-negotiable here:
 *
 *   1. The badge NEVER reads "verified". A fuzzy-matched quote proves the
 *      sentence was quoted, not that the claim follows from it.
 *   2. Claim and quote render adjacent, so the READER adjudicates entailment.
 *      Collapsing the quote behind a tooltip would hand that judgement back to
 *      the matcher, which is exactly what the design refuses to do.
 *
 * Tier is carried by a text label and a left rule, never by colour alone.
 */

const TIER_LABEL = {
  quote_located: "quote located",
  paraphrase: "paraphrase",
  inference: "inference",
} as const;

const TIER_RULE = {
  quote_located: "border-l-pillar-7",
  paraphrase: "border-l-pillar-2",
  inference: "border-l-border-strong",
} as const;

const TIER_TEXT = {
  quote_located: "text-pillar-text-7",
  paraphrase: "text-pillar-text-2",
  inference: "text-ink-faint",
} as const;

export function ClaimBlock({ claim }: { claim: Claim }) {
  const grounded = claim.tier !== "inference";

  return (
    <div className={cn("border-l-2 pl-s-4", TIER_RULE[claim.tier])}>
      <p className="font-sans text-[1.0625rem] leading-[1.7] text-ink">
        {claim.text}
      </p>

      <div className="mt-s-2 flex flex-wrap items-center gap-x-s-3 gap-y-1 font-mono text-[11px]">
        <span className={cn("uppercase tracking-wider", TIER_TEXT[claim.tier])}>
          {TIER_LABEL[claim.tier]}
        </span>
        {grounded && (
          <>
            <span className="rounded border border-border px-1.5 py-0.5 text-ink-faint">
              {claim.id}
            </span>
            <span className="text-ink-faint">p.{claim.page}</span>
            <span className="text-ink-faint">match {claim.score}</span>
          </>
        )}
      </div>

      {grounded ? (
        // Opaque paper, in both themes. This is source text being read, so it
        // follows the surface rule and never sits on glass.
        <blockquote className="mt-s-3 rounded-r-md bg-paper-muted px-s-4 py-s-3">
          <p className="font-serif text-[0.95rem] leading-[1.65] text-ink-muted">
            &ldquo;{claim.quote}&rdquo;
          </p>
        </blockquote>
      ) : (
        <p className="mt-s-2 font-sans text-[13px] leading-relaxed text-ink-faint">
          Model-generated, with no source excerpt checked against it. No citation
          is shown, and none will be until it clears the verifier.
        </p>
      )}
    </div>
  );
}
