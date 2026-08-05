import clsx from "clsx";
import type { EvidenceTier } from "@/types/anchor";

const LABEL: Record<EvidenceTier, string> = {
  quote_located: "quote located",
  paraphrase: "paraphrase",
  unsupported: "unsupported",
};

const DOT_CLASS: Record<EvidenceTier, string> = {
  quote_located: "bg-located",
  paraphrase: "bg-paraphrase",
  unsupported: "bg-unsupported",
};

/**
 * The tier badge for a claim's grounding. Never rename "quote located" to
 * "verified" -- a fuzzy-matched quote proves quotation provenance, not
 * entailment (plan.md §4).
 */
export function EvidenceBadge({ tier, className }: { tier: EvidenceTier; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-sans text-ink-muted",
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", DOT_CLASS[tier])} aria-hidden="true" />
      {LABEL[tier]}
    </span>
  );
}
