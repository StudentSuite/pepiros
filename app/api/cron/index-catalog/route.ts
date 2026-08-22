import { NextResponse } from "next/server";
import { runCatalogIndexBatch, pendingCatalogPapers, DEFAULT_BATCH_SIZE } from "@/lib/services/catalogIndexer";
import { isPdfIngestSupportedHere } from "@/lib/services/ingest";

/**
 * Weekly catalog indexing (issue #279).
 *
 * Turns catalog papers into mindmaps on a schedule rather than on a request:
 * a paper becomes a graph exactly once, and every page load afterwards reads
 * stored rows. Same shape as a crawler indexing a page once and serving the
 * index many times.
 *
 * AUTH. `CRON_SECRET`, checked against the Authorization header. Vercel Cron
 * sends it automatically for scheduled invocations; a manual call has to
 * present it too. Without the variable set the route refuses outright rather
 * than defaulting to open, because this endpoint spends model tokens and an
 * unauthenticated caller could loop it. Compared with a constant-time-ish
 * check to avoid leaking the secret a byte at a time through timing.
 *
 * BATCHED. Default 3 papers per run. Every generator call carries the whole
 * paper (docs/PLAN-V1.md 2), so a batch that finishes beats a batch that
 * trips a provider limit halfway. Whatever is left is picked up next week,
 * because the work is idempotent: a paper with an indexed_catalog row is
 * skipped and never re-spends tokens.
 */

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    // 404, not 401: a 401 confirms the route exists to anyone probing for a
    // token-spending endpoint.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Parsing shells out to Python, which no hosted Node runtime has (issue
  // #295). Said plainly rather than letting the cron fail obscurely every
  // week: on Vercel this route reports that it cannot run and the indexing is
  // done from a machine that can.
  if (!isPdfIngestSupportedHere()) {
    const pending = await pendingCatalogPapers();
    return NextResponse.json(
      {
        error: "ingest_unavailable_here",
        detail:
          "Indexing needs a local Python interpreter (PyMuPDF) that this hosted runtime does not have. " +
          "Run `npm run index:catalog` from a machine that does.",
        pending: pending.length,
      },
      { status: 501 },
    );
  }

  const url = new URL(request.url);
  const batchParam = Number(url.searchParams.get("batch"));
  const batchSize = Number.isFinite(batchParam) && batchParam > 0 ? batchParam : DEFAULT_BATCH_SIZE;

  const result = await runCatalogIndexBatch(batchSize);
  return NextResponse.json(result);
}
