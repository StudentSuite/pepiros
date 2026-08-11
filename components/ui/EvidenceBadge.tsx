import { Badge } from "./Badge";
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
    <Badge className={`text-ink-muted ${className ?? ""}`} dotClassName={DOT_CLASS[tier]}>
      {LABEL[tier]}
    </Badge>
  );
}
