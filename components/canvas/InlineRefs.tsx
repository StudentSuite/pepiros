import { RefChip } from "@/components/ui/RefChip";
import { resolveInlineRefs } from "@/lib/reader/inlineRefs";
import type { Evidence } from "@/types/anchor";

/**
 * The pure marker-parsing logic lives in lib/reader/inlineRefs.ts (Vitest
 * only collects lib/**, and a real bug there -- the marker regex not
 * matching the long, node-prefixed ids verify.ts actually mints -- needed
 * real regression coverage, not just a live check). Re-exported here so
 * every existing `@/components/canvas/InlineRefs` import keeps working.
 */
export { stripRefMarkers, resolveInlineRefs } from "@/lib/reader/inlineRefs";

function tooltipFor(ev: Evidence): string {
  const tier = ev.tier.replace("_", " ");
  if (!ev.anchor) return tier;
  const quote = ev.anchor.quote;
  const preview = quote.length > 90 ? `${quote.slice(0, 90)}…` : quote;
  return `${tier}: "${preview}"`;
}

/**
 * Renders a node's inline `[^eN]` markers as a row of small RefChips -- the markers
 * are pulled out of the prose flow (see stripRefMarkers) and shown together here so a
 * cramped canvas card doesn't have to lay out chips mid-sentence. Native `title`
 * gives a quote preview on hover without inventing a new tooltip primitive.
 */
export function InlineRefs({
  bodyMd,
  evidence,
  className,
}: {
  bodyMd: string;
  evidence: Evidence[];
  className?: string;
}) {
  const refs = resolveInlineRefs(bodyMd, evidence);
  if (refs.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-1"}>
      {refs.map((ev) => (
        <span key={ev.id} title={tooltipFor(ev)}>
          <RefChip refId={ev.refId} />
        </span>
      ))}
    </div>
  );
}
