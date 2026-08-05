import clsx from "clsx";
import type { Chunk, Evidence } from "@/types/anchor";

/**
 * "Grounding coverage" stat: what fraction of a paper's chunks have at least
 * one quote_located/paraphrase evidence row anchored to them, vs. none. Not a
 * claim that the paper is "verified" -- just how much of it the graph has
 * actually cited so far.
 */
export function CoverageOverlay({
  chunks,
  evidence,
}: {
  chunks: Chunk[];
  evidence: Evidence[];
}) {
  const groundedChunkIds = new Set(
    evidence
      .filter((e) => e.anchor && (e.tier === "quote_located" || e.tier === "paraphrase"))
      .map((e) => e.anchor!.chunkId),
  );

  const total = chunks.length;
  const covered = chunks.filter((c) => groundedChunkIds.has(c.id)).length;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

  // One dot per page in this paper, lit if that page has >=1 grounded chunk.
  const pages = Array.from(new Set(chunks.map((c) => c.page))).sort((a, b) => a - b);
  const groundedPages = new Set(chunks.filter((c) => groundedChunkIds.has(c.id)).map((c) => c.page));

  return (
    <div className="flex flex-col gap-2 font-sans text-xs">
      <div className="flex items-center justify-between">
        <span className="text-ink-muted">Grounding coverage</span>
        <span className="text-ink">
          {covered}/{total} chunks ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full rounded-full bg-located" style={{ width: `${pct}%` }} />
      </div>
      {pages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pages.map((page) => (
            <span
              key={page}
              title={`page ${page}${groundedPages.has(page) ? " -- has grounded evidence" : " -- no grounded evidence"}`}
              className={clsx(
                "flex h-4 w-4 items-center justify-center rounded-[3px] font-mono text-[9px]",
                groundedPages.has(page)
                  ? "bg-located/25 text-located ring-1 ring-located/60"
                  : "bg-surface-sunken text-ink-faint ring-1 ring-border",
              )}
            >
              {page}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
