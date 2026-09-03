"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { pdfjs } from "react-pdf";
import type { Chunk } from "@/types/anchor";
import { anchorHighlightsToMockPage } from "@/lib/reader/mockPageAnchor";
import { HighlightLayer, type Highlight } from "./HighlightLayer";

const PAGE_WIDTH = 612; // US-letter, 72dpi points
const PAGE_HEIGHT = 792;
const RENDER_WIDTH = 576; // matches the max-w-xl reading column below

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/** A chunk's topmost rect on its own page, for sorting same-page chunks into reading order. */
function topOf(chunk: Chunk): number {
  const ys = chunk.rects.filter((r) => r.page === chunk.page).map((r) => r.y0);
  return ys.length > 0 ? Math.min(...ys) : Infinity;
}

// react-pdf renders into a <canvas>, which pdfjs-dist can only touch in a
// real browser -- dynamic+ssr:false rather than a plain import so the
// server render never tries to construct one.
const Document = dynamic(() => import("react-pdf").then((m) => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), { ssr: false });

/**
 * The real ingested PDF (issue #76), overlaid with the same HighlightLayer
 * the old mock used -- rects are already authored in PDF point-space by
 * scripts/parse.py, so only the pageWidth/pageHeight fed to HighlightLayer
 * needs to track the actual loaded page's dimensions instead of an assumed
 * US-letter constant.
 *
 * Falls back to MockPdfPane when `pdfUrl` is null: the bundled fixture
 * workspace's papers are entirely synthetic (fake arXiv ids, no real file
 * ever existed), and PDF ingest itself only runs locally (isPdfIngestSupportedHere()
 * in lib/services/ingest.ts) -- so the demo deployment will always take this
 * fallback branch, which is expected, not a regression.
 */
export function PdfPane({
  chunk,
  paperChunks = [],
  pdfUrl,
  highlights = [],
  activeNodeId = null,
  onSelectHighlight,
}: {
  chunk: Chunk;
  /** Every chunk on this paper, used only by the mock-page fallback (below) to
   *  show the rest of the paper's real text around the active chunk instead
   *  of it in isolation. Ignored once a real PDF renders -- that page
   *  already has its own surrounding text. */
  paperChunks?: Chunk[];
  pdfUrl: string | null;
  highlights?: Highlight[];
  activeNodeId?: string | null;
  onSelectHighlight?: (nodeId: string) => void;
}) {
  const [pageSize, setPageSize] = useState({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
  const [failed, setFailed] = useState(false);

  // Issue #192: neither state was ever reset on a paper switch (ReaderClient
  // doesn't key/remount this component by pdfUrl). Once one paper's PDF
  // 404s, `failed` stayed true for the rest of the session -- every
  // subsequently viewed paper fell back to MockPdfPane even with a
  // perfectly valid PDF.
  useEffect(() => {
    setFailed(false);
    setPageSize({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
  }, [pdfUrl]);

  if (!pdfUrl || failed) {
    return (
      <MockPdfPane
        chunk={chunk}
        paperChunks={paperChunks}
        highlights={highlights}
        activeNodeId={activeNodeId}
        onSelectHighlight={onSelectHighlight}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded shadow-lg"
        style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }}
      >
        <Document
          file={pdfUrl}
          loading={<div className="h-full w-full animate-pulse bg-paper" />}
          error={<div className="h-full w-full bg-paper" />}
          onLoadError={() => setFailed(true)}
        >
          <Page
            pageNumber={chunk.page}
            width={RENDER_WIDTH}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={(page) =>
              setPageSize({ width: page.originalWidth, height: page.originalHeight })
            }
            onLoadError={() => setFailed(true)}
          />
        </Document>
        <HighlightLayer
          highlights={highlights}
          page={chunk.page}
          pageWidth={pageSize.width}
          pageHeight={pageSize.height}
          activeNodeId={activeNodeId}
          onSelectHighlight={onSelectHighlight}
        />
      </div>
    </div>
  );
}

/**
 * Placeholder for workspaces with no real PDF binary on disk -- the bundled
 * fixture, or a paper ingested before this repo persisted the file. Styles
 * the chunk's plain text to look like a page, same as this component used
 * to do unconditionally before react-pdf was wired up.
 */
function MockPdfPane({
  chunk,
  paperChunks,
  highlights,
  activeNodeId = null,
  onSelectHighlight,
}: {
  chunk: Chunk;
  paperChunks: Chunk[];
  highlights: Highlight[];
  activeNodeId?: string | null;
  onSelectHighlight?: (nodeId: string) => void;
}) {
  // Issue #323: see lib/reader/mockPageAnchor.ts's own doc comment.
  const anchoredHighlights = anchorHighlightsToMockPage(chunk, highlights);

  // A single chunk is a sentence or two, and this fixture-style paper rarely
  // has a same-page sibling to fall back on (the bundled fixture's papers
  // average ~3 chunks total, one per page) -- so "the rest of the page" is
  // really "the rest of the paper": every other real chunk, in page order,
  // each labelled with its own page so it never reads as continuous prose
  // with the active quote. Rendered strictly AFTER the active chunk's text,
  // never before: the highlight above is positioned by
  // anchorHighlightsToMockPage assuming the active chunk's own text starts
  // right at the top margin, so nothing may sit above it without shifting
  // the anchor off its highlighted quote.
  const restOfPaper = paperChunks
    .filter((c) => c.id !== chunk.id)
    .sort((a, b) => a.page - b.page || topOf(a) - topOf(b));

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="surface-reading paper-grain relative w-full max-w-xl overflow-hidden rounded shadow-lg"
        style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
      >
        {/* Issue #324: this sat before the text block below in DOM order
            with no z-index, so the (currently transparent) text div painted
            over it by default stacking -- confirmed 100% overlap by the
            automated detector. Harmless while that div stays background-
            less, but that was accidental, not a stacking decision; z-10
            makes "this label always shows" an actual guarantee. */}
        <div className="absolute right-3 top-2 z-10 font-mono text-2xs text-ink/50">
          p. {chunk.page}
        </div>
        {/* Faint ruled lines under everything, the way an unwritten
            manuscript page would look -- a fallback for whatever's still
            blank once the real text below (the active chunk, plus any other
            real chunks from this paper) runs out. Purely decorative and
            behind the real text/highlight layers, so nothing here touches
            anchor coordinates. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_23px,rgb(27_24_18_/_0.05)_23px,rgb(27_24_18_/_0.05)_24px)] [mask-image:linear-gradient(to_bottom,transparent,black_112px,black)]"
        />
        <div className="absolute inset-0 overflow-hidden p-10 pt-8 font-serif text-sm leading-relaxed">
          <p className="text-ink">{chunk.text}</p>
          {restOfPaper.map((c) => (
            <p key={c.id} className="mt-3 text-ink/50">
              <span className="mr-1.5 font-mono text-2xs uppercase tracking-wide text-ink/40">
                p.{c.page}
              </span>
              {c.text}
            </p>
          ))}
        </div>
        <HighlightLayer
          highlights={anchoredHighlights}
          page={chunk.page}
          pageWidth={PAGE_WIDTH}
          pageHeight={PAGE_HEIGHT}
          activeNodeId={activeNodeId}
          onSelectHighlight={onSelectHighlight}
        />
      </div>
      <p className="font-sans text-2xs text-ink-faint">
        Mock page render (no PDF binary is stored for this paper -- either it&rsquo;s the bundled
        demo workspace, whose papers are synthetic, or it predates issue #76&rsquo;s PDF storage) --
        highlight position is re-anchored to this chunk&rsquo;s own text (issue #323), not measured
        from it, so it can still drift on an unusually long or short chunk.
      </p>
    </div>
  );
}
