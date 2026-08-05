import type { Chunk } from "@/types/anchor";
import { HighlightLayer, type Highlight } from "./HighlightLayer";

const PAGE_WIDTH = 612; // US-letter, 72dpi points
const PAGE_HEIGHT = 792;

/**
 * Placeholder for the real PDF page: there is no seeded PDF binary anywhere
 * in this repo (react-pdf is installed but has nothing to load), so this
 * renders a mock paper-toned "page" at US-letter aspect ratio with the
 * chunk's prose text laid out on it, and highlight rects drawn as absolutely
 * positioned overlays scaled into that mock page's coordinate space. Swap
 * this for a real react-pdf <Page/> once scripts/parse.py lands.
 */
export function PdfPane({
  chunk,
  highlights = [],
}: {
  chunk: Chunk;
  highlights?: Highlight[];
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="surface-reading relative w-full max-w-xl overflow-hidden rounded shadow-lg"
        style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
      >
        <div className="absolute right-3 top-2 font-mono text-[11px] text-[#1c1a15]/50">
          p. {chunk.page}
        </div>
        <div className="absolute inset-0 overflow-hidden p-10 pt-8 font-serif text-[13px] leading-relaxed text-[#1c1a15]">
          {chunk.text}
        </div>
        <HighlightLayer
          highlights={highlights}
          page={chunk.page}
          pageWidth={PAGE_WIDTH}
          pageHeight={PAGE_HEIGHT}
        />
      </div>
      <p className="font-sans text-[11px] text-ink-faint">
        Mock page render (placeholder pending the real ingest pipeline / react-pdf wiring, see
        scripts/parse.py) -- highlight position is authored PDF point-space, not measured from
        this text.
      </p>
    </div>
  );
}
