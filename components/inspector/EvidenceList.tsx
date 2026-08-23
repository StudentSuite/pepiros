import type { Evidence } from "@/types/anchor";
import { RefChip } from "@/components/ui/RefChip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";

/**
 * Evidence rows for a node. The `anchor === null` branch is exactly the
 * fixture's planted-misattribution case ("e6"): the quote didn't clear the
 * paraphrase floor on re-verification, so the anchor was dropped -- render
 * that honestly instead of hiding it.
 */
/** The fixture attaches this extra field only to the planted-misattribution
 *  row ("e6"); it isn't part of the frozen Evidence contract, so read it via
 *  a narrow local cast rather than editing types/anchor.ts. */
type EvidenceWithTestingField = Evidence & { claimedQuoteForTesting?: string };

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return <p className="font-sans text-xs text-ink-faint">No evidence rows for this node.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {evidence.map((e) => {
        const claimedQuote = (e as EvidenceWithTestingField).claimedQuoteForTesting;
        return (
          <li key={e.id} className="rounded border border-border bg-surface-raised p-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <RefChip refId={e.refId} />
              <EvidenceBadge tier={e.tier} />
              {/* Issue #324: 10px was below the accessible text-size floor. */}
              <span className="font-mono text-[11px] text-ink-faint">
                match {Math.round(e.matchScore * 100)}%
              </span>
              {e.numericOk !== null && (
                <span className="font-mono text-[11px] text-ink-faint">
                  numeric {e.numericOk ? "ok" : "mismatch"}
                </span>
              )}
            </div>

            {e.anchor ? (
              <p className="font-serif text-sm italic leading-snug text-ink">
                &ldquo;{e.anchor.quote}&rdquo;
              </p>
            ) : (
              <div className="font-sans text-xs text-ink-muted">
                <p>This citation was dropped -- the quote could not be relocated in the source on re-verification.</p>
                {typeof claimedQuote === "string" && (
                  <p className="mt-1 font-serif italic text-ink-faint line-through decoration-unsupported/60">
                    &ldquo;{claimedQuote}&rdquo;
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
