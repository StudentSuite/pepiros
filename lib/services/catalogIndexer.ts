import "server-only";
import { CATALOG, isFetchableLicence, type CatalogPaper } from "@/lib/data/papers";
import { resolveSourceUrl, validateUpload } from "./upload";
import { runIngest } from "./ingest";
import { createWorkspace } from "./workspaces";
import { createJob, getJob } from "./jobs";
import { fetchWorkspace } from "./workspace";
import { getIndexedCatalogEntries, upsertIndexedCatalogEntry } from "@/lib/db/queries";

/**
 * Turning catalog papers into mindmaps, one batch at a time (issue #279).
 *
 * WHAT THIS IS. Indexing, not a request path. A paper becomes a graph exactly
 * once, on a schedule, and every reader afterwards is looking at stored rows.
 * The expensive part (parse, generate, verify) happens on a cron; the cheap
 * part (read the graph) is what a page load does. That is the same shape as
 * a search engine crawling a page once and serving the index a million times.
 *
 * WHY BATCHES ARE SMALL BY DEFAULT. Every generator call carries the whole
 * paper (docs/PLAN-V1.md 2's deliberate "whole paper in context, no
 * embeddings"), which is 13-22k input tokens per request against a free
 * model tier. A weekly run does not need to be fast, and a small batch that
 * finishes beats a large one that trips a provider limit halfway and leaves
 * the catalog half-written. Anything not done this week is picked up next
 * week, because the work is idempotent.
 *
 * IDEMPOTENT, and that is what makes the schedule safe. A paper that already
 * has an indexed_catalog row is skipped, so re-running never duplicates work
 * or spends tokens twice, and a run that dies partway simply resumes.
 */

export interface IndexOutcome {
  slug: string;
  status: "indexed" | "skipped" | "failed";
  workspaceId?: string;
  detail?: string;
  chunks?: number;
  nodes?: number;
  evidence?: number;
}

export interface IndexRunResult {
  indexed: number;
  failed: number;
  skipped: number;
  remaining: number;
  outcomes: IndexOutcome[];
}

/** Deliberately low. See the batch note above. */
export const DEFAULT_BATCH_SIZE = 3;

/**
 * A PDF url reachable without a resolver hop. arXiv is a pure abs -> pdf
 * rewrite; PMC and DOI need a network resolution step that runIngest's own
 * URL path owns, so an entry needing one is reported rather than
 * half-resolved here.
 */
function directPdfUrl(paper: CatalogPaper): string | null {
  return resolveSourceUrl(paper.sourceUrl).pdfUrl ?? null;
}

/**
 * Papers eligible for indexing, in catalog order.
 *
 * Gated on licence, not on whether the PDF happens to be reachable:
 * ingesting something we have no right to redistribute is a worse failure
 * than an unindexed paper, so a paywalled or unverified entry (issue #285)
 * is never fetched at all.
 */
export async function pendingCatalogPapers(): Promise<CatalogPaper[]> {
  const done = new Set((await getIndexedCatalogEntries()).map((e) => e.slug));
  return CATALOG.filter((p) => isFetchableLicence(p.licence) && !done.has(p.slug));
}

async function indexOne(paper: CatalogPaper): Promise<IndexOutcome> {
  const pdfUrl = directPdfUrl(paper);
  if (!pdfUrl) {
    return { slug: paper.slug, status: "skipped", detail: `no directly fetchable PDF from ${paper.sourceUrl}` };
  }

  const res = await fetch(pdfUrl);
  if (!res.ok) {
    return { slug: paper.slug, status: "failed", detail: `fetching the PDF returned ${res.status}` };
  }
  const bytes = new Uint8Array(await res.arrayBuffer());

  // The same validation the upload route runs. A catalog entry is not exempt
  // from the page cap or the text-layer check: a scanned PDF would sail past
  // parse.py and produce an empty graph that still looks indexed.
  const validation = validateUpload(bytes);
  if (!validation.ok) {
    return { slug: paper.slug, status: "failed", detail: validation.message ?? "failed upload validation" };
  }

  // Unowned on purpose (issue #231): the catalog is public library content,
  // not any one account's private workspace.
  const workspace = await createWorkspace(paper.title, null);
  const job = createJob({
    workspaceId: workspace.id,
    source: { kind: "catalog", url: pdfUrl, slug: paper.slug },
  });

  await runIngest({
    jobId: job.id,
    workspaceId: workspace.id,
    paperTitle: paper.title,
    sourceUrl: paper.sourceUrl,
    bytes,
  });

  // runIngest signals failure by calling failJob() on its own in-memory job
  // rather than by throwing, so awaiting it says nothing about whether
  // anything was written. Checked explicitly, because the first version of
  // this reported "indexed 11, failed 0" with every workspace empty.
  const finished = getJob(job.id);
  if (finished?.status === "failed") {
    return { slug: paper.slug, status: "failed", detail: (finished.error ?? "unknown error").split("\n")[0] };
  }

  const result = await fetchWorkspace(workspace.id);
  if (result.papers.length === 0 || result.chunks.length === 0) {
    return { slug: paper.slug, status: "failed", detail: "ingest finished but wrote no paper or chunks" };
  }

  // Recorded in Postgres rather than written back into lib/data/papers.ts:
  // that file is checked-in source describing the catalog, and which papers
  // happen to be indexed is runtime state that differs per deployment. A
  // script silently rewriting source is how you lose track of what is real.
  await upsertIndexedCatalogEntry({
    slug: paper.slug,
    workspaceId: workspace.id,
    paperId: result.papers[0]!.id,
  });

  return {
    slug: paper.slug,
    status: "indexed",
    workspaceId: workspace.id,
    chunks: result.chunks.length,
    nodes: result.nodes.length,
    evidence: result.evidence.length,
  };
}

export async function runCatalogIndexBatch(batchSize = DEFAULT_BATCH_SIZE): Promise<IndexRunResult> {
  const pending = await pendingCatalogPapers();
  const batch = pending.slice(0, batchSize);
  const outcomes: IndexOutcome[] = [];

  for (const paper of batch) {
    try {
      outcomes.push(await indexOne(paper));
    } catch (err) {
      // One bad paper must not abandon the rest of the batch: each takes real
      // minutes, and a mid-run abort wastes every one before it.
      outcomes.push({
        slug: paper.slug,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const indexed = outcomes.filter((o) => o.status === "indexed").length;
  return {
    indexed,
    failed: outcomes.filter((o) => o.status === "failed").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    remaining: Math.max(0, pending.length - indexed),
    outcomes,
  };
}
