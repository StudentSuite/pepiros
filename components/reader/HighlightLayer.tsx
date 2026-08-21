import clsx from "clsx";
import type { AnchorRect, EvidenceTier } from "@/types/anchor";

// Issue #183: color alone (hue) was the only signal distinguishing tiers,
// invisible to colorblind users. Border *style* -- solid/dashed/dotted -- is
// an orthogonal, non-color channel layered on top of the same tokens rather
// than a new color, so a monochrome view still tells the tiers apart.
const TIER_BG: Record<EvidenceTier, string> = {
  quote_located: "bg-located/30 border-2 border-solid border-located/70",
  paraphrase: "bg-paraphrase/25 border-2 border-dashed border-paraphrase/70",
  unsupported: "bg-unsupported/25 border-2 border-dotted border-unsupported/70",
};

const TIER_LABEL: Record<EvidenceTier, string> = {
  quote_located: "quote located",
  paraphrase: "paraphrase",
  unsupported: "unsupported",
};

export interface Highlight {
  /** Unique per highlight (e.g. the owning Evidence.id) -- used as the React key root. */
  id: string;
  spans: AnchorRect[];
  tier: EvidenceTier;
  /** Issue #243: which claim this evidence grounds, so a click can select it. */
  nodeId: string;
}

/**
 * Absolutely-positioned overlay boxes for one mock PDF page, extracted out of
 * PdfPane so it's reusable/testable independent of the page chrome (plan.md
 * §4: multi-span anchors are required, so a single highlight can render N
 * boxes here, never just one).
 *
 * Rects are authored in PDF point-space (a ~612x792pt US-letter page);
 * `pageWidth`/`pageHeight` are that page's point dimensions, and each rect is
 * scaled into the container's percentage space so it lines up regardless of
 * the container's rendered pixel size.
 */
export function HighlightLayer({
  highlights,
  page,
  pageWidth = 612,
  pageHeight = 792,
  activeNodeId = null,
  onSelectHighlight,
}: {
  highlights: Highlight[];
  page: number;
  pageWidth?: number;
  pageHeight?: number;
  /** Issue #243: the currently-selected claim's own highlight(s) render brighter. */
  activeNodeId?: string | null;
  onSelectHighlight?: (nodeId: string) => void;
}) {
  return (
    // The layer itself stays inert (a page's prose sits under it and still
    // needs to be selectable/scrollable); only the individual boxes below
    // opt back in to pointer events so a click can land on one.
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {highlights.flatMap((h) =>
        h.spans
          .filter((span) => span.page === page)
          .map((span, i) => {
            const active = activeNodeId != null && h.nodeId === activeNodeId;
            return (
              <button
                key={`${h.id}-${i}`}
                type="button"
                title={TIER_LABEL[h.tier]}
                aria-label={`${TIER_LABEL[h.tier]} quote, opens its claim`}
                onClick={() => onSelectHighlight?.(h.nodeId)}
                className={clsx(
                  "pointer-events-auto absolute animate-[highlight-pulse_var(--dur-slow)_var(--ease-out)] rounded-sm transition-[filter,box-shadow] duration-fast ease-out",
                  TIER_BG[h.tier],
                  active && "shadow-e-2 brightness-125",
                )}
                style={{
                  left: `${(span.x0 / pageWidth) * 100}%`,
                  top: `${(span.y0 / pageHeight) * 100}%`,
                  width: `${((span.x1 - span.x0) / pageWidth) * 100}%`,
                  height: `${((span.y1 - span.y0) / pageHeight) * 100}%`,
                }}
              />
            );
          }),
      )}
    </div>
  );
}
