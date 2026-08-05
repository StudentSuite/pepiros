import { RefChip } from "@/components/ui/RefChip";
import type { Evidence } from "@/types/anchor";

const REF_MARKER = /\[\^(e\d+)\]/g;

/** Strips inline `[^eN]` markers out of body text so a truncated card snippet reads
 *  as clean prose; the markers themselves surface as a `RefChip` row via InlineRefs. */
export function stripRefMarkers(bodyMd: string): string {
  return bodyMd.replace(REF_MARKER, "").replace(/\s{2,}/g, " ").trim();
}

/** Resolves a node's inline `[^eN]` markers to their evidence rows, in first-seen
 *  order. A marker with no matching row is skipped here -- a dangling `[^eN]` is a
 *  render error elsewhere in the pipeline (plan.md §5), not something to mask. */
export function resolveInlineRefs(bodyMd: string, evidence: Evidence[]): Evidence[] {
  const ids = [...bodyMd.matchAll(REF_MARKER)].map((m) => m[1]!);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const result: Evidence[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = byId.get(id);
    if (row) result.push(row);
  }
  return result;
}

function tooltipFor(ev: Evidence): string {
  const tier = ev.tier.replace("_", " ");
  if (!ev.anchor) return tier;
  const quote = ev.anchor.quote;
  const preview = quote.length > 90 ? `${quote.slice(0, 90)}…` : quote;
  return `${tier} — "${preview}"`;
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
