import clsx from "clsx";
import type { AnchorRect, EvidenceTier } from "@/types/anchor";

const TIER_BG: Record<EvidenceTier, string> = {
  quote_located: "bg-located/30 ring-1 ring-located/70",
  paraphrase: "bg-paraphrase/25 ring-1 ring-paraphrase/70",
  unsupported: "bg-unsupported/25 ring-1 ring-unsupported/70",
};

export interface Highlight {
  /** Unique per highlight (e.g. the owning Evidence.id) -- used as the React key root. */
  id: string;
  spans: AnchorRect[];
  tier: EvidenceTier;
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
}: {
  highlights: Highlight[];
  page: number;
  pageWidth?: number;
  pageHeight?: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {highlights.flatMap((h) =>
        h.spans
          .filter((span) => span.page === page)
          .map((span, i) => (
            <div
              key={`${h.id}-${i}`}
              className={clsx(
                "absolute rounded-sm transition-opacity duration-200",
                TIER_BG[h.tier],
              )}
              style={{
                left: `${(span.x0 / pageWidth) * 100}%`,
                top: `${(span.y0 / pageHeight) * 100}%`,
                width: `${((span.x1 - span.x0) / pageWidth) * 100}%`,
                height: `${((span.y1 - span.y0) / pageHeight) * 100}%`,
              }}
            />
          )),
      )}
    </div>
  );
}
