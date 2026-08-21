import "server-only";
import { z } from "zod";
import { writeFile, unlink, mkdir, copyFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Chunk, GraphEdge, GraphNode, Numeric, Paper, Workspace } from "@/types/anchor";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { fetchWorkspace } from "./workspace";
import { getIngestedWorkspace, setIngestedWorkspace } from "./ingestStore";
import { appendEvent, createJob, failJob } from "./jobs";
import { UserFacingError } from "@/lib/errors";
import {
  findDuplicate,
  resolveSourceUrl,
  reserveIngest,
  releaseIngest,
  validateUpload,
  type DuplicateMatch,
  type ResolvedSource,
} from "./upload";
import { runPythonScript } from "./pythonRunner";
import { resolveDoiToPdfUrl } from "./unpaywall";

/**
 * Orchestrates parse -> generate -> merge for one paper (docs/PLAN-V1.md
 * §4.3, §7-8): scripts/parse.py (PyMuPDF, real extraction) -> assign stable
 * per-workspace citation ordinals -> lib/agents/orchestrator.ts (archetype,
 * pillar plan, generator fan-out, deterministic re-verification) -> merge the
 * result into whatever the target workspace already had, through
 * lib/services/ingestStore.ts.
 *
 * Runs in-process, fire-and-forget from the route handler: there is no queue
 * (docs/PLAN-V1.md's job system is itself in-memory, see jobs.ts), so this is
 * good enough for local dev/demo, same caveat jobs.ts already states.
 */

interface ParsedChunk {
  page: number;
  kind: string;
  text: string;
  sectionIndex: number | null;
  rects: Array<{ page: number; x0: number; y0: number; x1: number; y1: number }>;
}

interface ParsedFigure {
  page: number;
  caption: string | null;
  imageBase64: string;
  sectionIndex: number | null;
  rect: { page: number; x0: number; y0: number; x1: number; y1: number };
}

interface ParsedNumeric {
  chunkIndex: number;
  rawText: string;
  value: number;
  unit: string | null;
  comparator: string | null;
  role: string;
}

interface ParsedDocument {
  title: string | null;
  authors: string[];
  year: number | null;
  sections: Array<{ title: string; order: number }>;
  chunks: ParsedChunk[];
  numerics: ParsedNumeric[];
  figures: ParsedFigure[];
  references: Array<{ rawText: string; doi: string | null }>;
  pageCount: number;
}

const RectSchema = z.object({ page: z.number(), x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() });

/**
 * Issue #269: runPythonScript<ParsedDocument>'s `JSON.parse(...) as T` is a
 * bare type assertion, not a runtime check -- any valid JSON scripts/parse.py
 * happens to emit satisfies it, with zero shape validation. A field a future
 * parse.py change omits or mistypes (e.g. `rects: undefined`, which violates
 * CLAUDE.md's "multi-span anchors are always an array" invariant) would
 * silently flow straight into a persisted Chunk/Numeric/GraphNode instead of
 * failing the job with a clear, named diagnosis. Mirrors the ParsedChunk/
 * ParsedFigure/ParsedNumeric interfaces above exactly.
 */
const ParsedDocumentSchema = z.object({
  title: z.string().nullable(),
  authors: z.array(z.string()),
  year: z.number().nullable(),
  sections: z.array(z.object({ title: z.string(), order: z.number() })),
  chunks: z.array(
    z.object({
      page: z.number(),
      kind: z.string(),
      text: z.string(),
      sectionIndex: z.number().nullable(),
      rects: z.array(RectSchema),
    }),
  ),
  numerics: z.array(
    z.object({
      chunkIndex: z.number(),
      rawText: z.string(),
      value: z.number(),
      unit: z.string().nullable(),
      comparator: z.string().nullable(),
      role: z.string(),
    }),
  ),
  figures: z.array(
    z.object({
      page: z.number(),
      caption: z.string().nullable(),
      imageBase64: z.string(),
      sectionIndex: z.number().nullable(),
      rect: RectSchema,
    }),
  ),
  references: z.array(z.object({ rawText: z.string(), doi: z.string().nullable() })),
  pageCount: z.number(),
});

async function runParsePy(pdfPath: string): Promise<ParsedDocument> {
  const raw = await runPythonScript<unknown>(path.join(process.cwd(), "scripts", "parse.py"), [pdfPath]);
  const result = ParsedDocumentSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`scripts/parse.py produced output that doesn't match the expected shape: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Local disk, not Supabase Storage: ingest itself is already local-only
 * (isPdfIngestSupportedHere() below), so a real PDF only ever exists on the
 * machine that just parsed it. `pdfStoragePath` stores a filename relative
 * to this directory, resolved by app/api/papers/[paperId]/pdf/route.ts --
 * the only reader of this path, so the two must stay in sync.
 */
const PDF_STORAGE_DIR = path.join(process.cwd(), "data", "pdfs");

export function resolvePdfStoragePath(relativePath: string): string {
  return path.join(PDF_STORAGE_DIR, relativePath);
}

/**
 * PDF ingest is deliberately local-only (plan.md's cut list: "a deployed
 * Python service, PyMuPDF/PaddleOCR run as local scripts only"): parsing
 * shells out to scripts/parse.py, and Vercel's Node.js serverless runtime
 * has no Python interpreter at all -- confirmed live, not assumed: a real
 * ingest attempt against the deployed site failed with "Could not find a
 * Python interpreter (tried python3 and python)". No PATH fix can change
 * this on Vercel's standard Node runtime; it isn't a configuration problem.
 *
 * Checked via `VERCEL`, which Vercel sets in every deployment regardless of
 * value, rather than attempting a doomed spawn per request just to hit the
 * same ENOENT every time. app/api/ingest/route.ts calls this before doing
 * any other work, so a request fails fast with an honest explanation
 * instead of creating a job that can then never make progress -- ingest
 * jobs are also process-local in-memory (jobs.ts) and the background
 * pipeline itself doesn't survive past the triggering request on
 * serverless (issues #86/#87), both of which this check makes moot for
 * ingest specifically by never starting one there at all.
 */
export function isPdfIngestSupportedHere(): boolean {
  return !process.env.VERCEL;
}

export interface IngestInput {
  jobId: string;
  workspaceId: string;
  paperTitle: string;
  sourceUrl: string | null;
  bytes: Uint8Array;
}

export async function runIngest(input: IngestInput): Promise<void> {
  const tmpPath = path.join(tmpdir(), `pepiros-ingest-${randomUUID()}.pdf`);
  // Issue #271: the permanent copy below persists before generation/merge
  // finishes; if either fails afterward, this used to leave that file
  // orphaned on disk forever, unreferenced by any paper record. Tracked
  // here (outside the try block) so the catch below can clean it up too.
  let copiedPdfPath: string | null = null;

  try {
    await writeFile(tmpPath, input.bytes);

    appendEvent(input.jobId, "Extracting text", "Running PyMuPDF extraction.");
    const parsed = await runParsePy(tmpPath);

    appendEvent(
      input.jobId,
      "Finding sections",
      `Found ${parsed.sections.length} sections across ${parsed.pageCount} pages.`,
    );

    const ingested = await getIngestedWorkspace(input.workspaceId);
    const rawBase = ingested?.workspace ?? (await fetchWorkspace(input.workspaceId));
    const paperId = `paper-${randomUUID().slice(0, 8)}`;
    const workspaceId = input.workspaceId;

    // Issue #102: fetchWorkspace()'s fixture fallback returns
    // fixtures/workspace.json verbatim -- unchanged `id` included -- for any
    // never-ingested workspaceId, so ingesting into a brand-new workspace
    // (anything other than the actual demo workspace, ws-1) got the fixture's
    // 3 demo papers as `base` instead of starting empty. Two bugs from one
    // root cause: merging them in was semantically wrong (a new workspace
    // silently inheriting unrelated demo content), and mechanically broken
    // (every paper/node/edge in that fixture hardcodes workspaceId: "ws-1",
    // so saveWorkspace()'s insert referenced a `workspaces` row that was
    // never created under the real target id -- a foreign-key violation on
    // every first-ever ingest into any workspace other than ws-1). Only
    // ws-1 itself should ever merge with the fixture; every other id starts
    // from a real empty workspace.
    const base: Workspace =
      rawBase.id === workspaceId
        ? rawBase
        : { id: workspaceId, name: rawBase.name, papers: [], chunks: [], numerics: [], nodes: [], edges: [], evidence: [] };
    // The PDF's own embedded title, when present, is more trustworthy than a
    // guess derived from the uploaded filename or a pasted URL.
    const paperTitle = parsed.title || input.paperTitle;

    // Persist the actual PDF now that parsing succeeded (issue #76: PdfPane
    // rendered a styled mock because no ingested PDF was ever kept around
    // for it to load -- the tmp file used to just get unlink()'d below).
    // Copy rather than rename: tmpPath's cleanup in `finally` must still run
    // unconditionally regardless of which branch this try block takes.
    const pdfFilename = `${paperId}.pdf`;
    await mkdir(PDF_STORAGE_DIR, { recursive: true });
    const permanentPdfPath = resolvePdfStoragePath(pdfFilename);
    await copyFile(tmpPath, permanentPdfPath);
    copiedPdfPath = permanentPdfPath;

    let chunkOrdinal = base.chunks.reduce((max, c) => Math.max(max, c.ordinal), 0);
    let numericOrdinal = base.numerics.reduce((max, n) => Math.max(max, n.ordinal), 0);

    const chunks: Chunk[] = parsed.chunks.map((c, i) => ({
      id: `${paperId}-c${i + 1}`,
      paperId,
      sectionId: c.sectionIndex !== null ? `${paperId}-s${c.sectionIndex}` : null,
      kind: (["prose", "figure_caption", "table", "equation"].includes(c.kind) ? c.kind : "prose") as Chunk["kind"],
      page: c.page,
      text: c.text,
      ordinal: ++chunkOrdinal,
      rects: c.rects,
    }));

    // Issue #59: one figure_caption chunk per detected figure that has a
    // real, non-null caption -- a figure Pix2Text couldn't match a caption
    // for has no citable text, so it's dropped rather than given a chunk
    // with nothing a downstream verifier could check. figureImages pairs
    // each such chunk's own ref id with its cropped image, in-memory only
    // (see GeneratorContext.images), so the `figures` generator can be
    // shown the image labeled with the same id it's meant to cite.
    const figureChunks: Chunk[] = [];
    const figureImages: Array<{ refId: string; base64: string; mediaType: string }> = [];
    parsed.figures.forEach((figure, i) => {
      if (!figure.caption) return;
      const ordinal = ++chunkOrdinal;
      figureChunks.push({
        id: `${paperId}-fig${i + 1}`,
        paperId,
        sectionId: figure.sectionIndex !== null ? `${paperId}-s${figure.sectionIndex}` : null,
        kind: "figure_caption",
        page: figure.page,
        text: figure.caption,
        ordinal,
        rects: [figure.rect],
      });
      figureImages.push({ refId: `C${ordinal}`, base64: figure.imageBase64, mediaType: "image/png" });
    });
    const allChunks = [...chunks, ...figureChunks];

    appendEvent(input.jobId, "Building numeric ledger", `Extracted ${parsed.numerics.length} numeric values.`);

    const numerics: Numeric[] = parsed.numerics
      .map((n): Numeric | null => {
        const chunk = chunks[n.chunkIndex];
        if (!chunk) return null;
        return {
          id: `${paperId}-n${++numericOrdinal}`,
          chunkId: chunk.id,
          rawText: n.rawText,
          value: n.value,
          unit: n.unit,
          comparator: (n.comparator as Numeric["comparator"]) ?? null,
          ordinal: numericOrdinal,
          role: n.role,
        };
      })
      .filter((n): n is Numeric => n !== null);

    appendEvent(input.jobId, "Reading methods", "Classifying archetype and planning pillars.");
    const result = await runOrchestrator({
      workspaceId,
      paperId,
      paperTitle,
      chunks: allChunks,
      numerics,
      figureImages,
      // Real incremental progress: these fire as each sub-stage actually
      // completes (pillar planning, then each leaf generator as it resolves,
      // concurrency-limited so they land spread over real elapsed time), not
      // all at once after the whole fan-out finishes.
      onProgress: (event) => {
        if (event.type === "archetype") {
          appendEvent(input.jobId, "Reading methods", `Classified as ${event.detail}.`);
        } else if (event.type === "pillars") {
          appendEvent(input.jobId, "Planning your workspace", event.detail);
        } else {
          appendEvent(input.jobId, "Writing notes", event.detail);
        }
      },
    });

    // Issue #95: runOrchestrator() already classifies a real archetype (used
    // internally for pillar planning) but it was never written back onto
    // the Paper record -- every real-ingested paper's archetype stayed
    // null forever, same class of gap as #82's authors/year. Persisting it
    // is also what makes lib/services/synthesis.ts's new Methodological
    // Divergence node meaningful beyond the fixture, which already had real
    // (hand-authored) archetype values.
    const paper: Paper = {
      id: paperId,
      workspaceId,
      title: paperTitle,
      authors: parsed.authors,
      year: parsed.year,
      archetype: result.archetype,
      sourceUrl: input.sourceUrl,
      pdfStoragePath: pdfFilename,
    };

    appendEvent(input.jobId, "Locating anchors", "Verifying every claim against the source.");

    const okLeaves = result.leaves.filter(
      (l): l is typeof l & { node: GraphNode; evidence: NonNullable<(typeof l)["evidence"]> } =>
        l.status === "ok" && Boolean(l.node),
    );

    const paperNode: GraphNode = {
      id: paperId,
      workspaceId,
      type: "paper",
      title: paperTitle,
      bodyMd: "",
      pillarIndex: null,
      x: 0,
      y: 0,
      paperId,
      stale: false,
    };

    const pillarNodeByKey = new Map(result.pillarPlan.pillars.map((p, i) => [p.key, result.pillarNodes[i]!] as const));
    const edges: GraphEdge[] = result.pillarNodes.map((pillar) => ({
      id: `${paperId}-e-paper-${pillar.id}`,
      workspaceId,
      kind: "contains",
      sourceId: paperNode.id,
      targetId: pillar.id,
    }));
    for (const leaf of okLeaves) {
      const pillarNode = pillarNodeByKey.get(leaf.pillarKey);
      if (!pillarNode) continue;
      edges.push({
        id: `${paperId}-e-${pillarNode.id}-${leaf.node.id}`,
        workspaceId,
        kind: "contains",
        sourceId: pillarNode.id,
        targetId: leaf.node.id,
      });
    }

    function buildMerged(intoBase: Workspace, chunksToMerge: Chunk[], numericsToMerge: Numeric[]): Workspace {
      return {
        id: workspaceId,
        name: intoBase.name,
        papers: [...intoBase.papers, paper],
        chunks: [...intoBase.chunks, ...chunksToMerge],
        numerics: [...intoBase.numerics, ...numericsToMerge],
        nodes: [...intoBase.nodes, paperNode, ...result.pillarNodes, ...okLeaves.map((l) => l.node)],
        edges: [...intoBase.edges, ...edges],
        evidence: [...intoBase.evidence, ...okLeaves.flatMap((l) => l.evidence)],
      };
    }

    // Issue #103: this is the widest window of them all -- `rawBase` was read
    // before the PyMuPDF parse and the full generator fan-out, 15-45s per
    // plan.md §1, the exact stretch a concurrent edit or another ingest is
    // most likely to land in. `ingested?.version` (undefined only when there
    // was no real row yet to race against) makes a stale write here fail
    // loudly instead of silently discarding whatever landed in that window.
    //
    // Issue #178/#270: this used to retry exactly once. A *third* concurrent
    // ingest landing in that same retry's own read-modify-write window hit a
    // second version conflict, which wasn't caught locally and propagated to
    // the outer catch below, discarding an already-completed 15-45s
    // generator run (real LLM calls) purely because two *other, unrelated*
    // papers happened to commit first -- none of the three actually
    // conflict (different paperIds, purely additive). Now a bounded loop:
    // each retry re-reads the current workspace and re-computes the ordinal
    // shift from where the *previous* attempt's chunks/numerics were last
    // aligned, so repeated concurrent writers each get one more chance
    // instead of the second one being fatal. Chunk/numeric ordinals are
    // shifted so this paper's chunks can't collide with whatever the other
    // ingest(s) just added -- ordinals are a global, never-per-paper-reset
    // counter this whole citation system depends on staying unique. The
    // shift can leave an already-verified evidence row's displayed ref
    // (e.g. "C23", baked in during the generator pass above) cosmetically
    // out of step with that chunk's new ordinal number; the citation itself
    // still resolves correctly since anchoring is by the chunk's stable id,
    // never by ordinal, at read time.
    const MAX_MERGE_ATTEMPTS = 3;
    let mergeBase = base;
    let mergeVersion = ingested?.version;
    let mergeChunks = allChunks;
    let mergeNumerics = numerics;

    for (let attempt = 1; ; attempt++) {
      try {
        await setIngestedWorkspace(buildMerged(mergeBase, mergeChunks, mergeNumerics), mergeVersion);
        break;
      } catch (err) {
        if (!(err instanceof UserFacingError) || attempt >= MAX_MERGE_ATTEMPTS) throw err;

        const priorMaxChunkOrdinal = mergeBase.chunks.reduce((max, c) => Math.max(max, c.ordinal), 0);
        const priorMaxNumericOrdinal = mergeBase.numerics.reduce((max, n) => Math.max(max, n.ordinal), 0);

        const retryIngested = await getIngestedWorkspace(workspaceId);
        const retryBase = retryIngested?.workspace ?? (await fetchWorkspace(workspaceId));
        const newMaxChunkOrdinal = retryBase.chunks.reduce((max, c) => Math.max(max, c.ordinal), 0);
        const newMaxNumericOrdinal = retryBase.numerics.reduce((max, n) => Math.max(max, n.ordinal), 0);
        const chunkShift = newMaxChunkOrdinal - priorMaxChunkOrdinal;
        const numericShift = newMaxNumericOrdinal - priorMaxNumericOrdinal;

        mergeChunks = mergeChunks.map((c) => ({ ...c, ordinal: c.ordinal + chunkShift }));
        mergeNumerics = mergeNumerics.map((n) => ({ ...n, ordinal: n.ordinal + numericShift }));
        mergeBase = retryBase;
        mergeVersion = retryIngested?.version;
      }
    }
    appendEvent(
      input.jobId,
      "Ready",
      `"${paperTitle}" is ready: ${okLeaves.length} notes across ${result.pillarNodes.length} pillars.`,
    );
  } catch (err) {
    failJob(input.jobId, err instanceof Error ? err.message : String(err));
    // Issue #271: don't leave the permanent copy behind for a paper that
    // never actually made it into the workspace.
    if (copiedPdfPath) await unlink(copiedPdfPath).catch(() => {});
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

/**
 * app/api/papers/[paperId]/pdf/route.ts's only reader. `fetchWorkspace` is
 * the one seam for "does this paper exist in this workspace" (fixture papers
 * always resolve here with `pdfStoragePath: null`, since none of them have a
 * real file -- see fixtures/workspace.json's doc comment), so this doesn't
 * duplicate that lookup with a second path.
 */
export async function getPaperPdfBytes(workspaceId: string, paperId: string): Promise<Uint8Array | null> {
  const workspace = await fetchWorkspace(workspaceId);
  const paper = workspace.papers.find((p) => p.id === paperId);
  if (!paper?.pdfStoragePath) return null;
  try {
    return await readFile(resolvePdfStoragePath(paper.pdfStoragePath));
  } catch {
    return null;
  }
}

export type QueueUrlIngestResult =
  | { jobId: string; source: ResolvedSource }
  | { error: "unsupported_source" | "duplicate"; detail: string; duplicate?: DuplicateMatch };

/**
 * Shared by POST /api/ingest's URL path and the MCP `add_paper` tool
 * (docs/PLAN-V1.md §13.2), so a paper queued from either surface goes
 * through one duplicate check and one job/ingest kickoff, not two that could
 * drift (CLAUDE.md's service-layer boundary).
 */
export async function queueUrlIngest(workspaceId: string, url: string): Promise<QueueUrlIngestResult> {
  const resolved = resolveSourceUrl(url);
  if (resolved.kind === "unsupported") {
    return { error: "unsupported_source", detail: resolved.message ?? "Unsupported link." };
  }

  // Reserved before the duplicate check runs (issue #104): the check and the
  // reservation together close the race a bare check-then-act leaves open.
  const identity = resolved.doi ?? resolved.pdfUrl ?? url;
  if (!reserveIngest(workspaceId, identity)) {
    return {
      error: "duplicate",
      detail: "This source is already being added to this workspace -- give it a moment.",
    };
  }

  const workspace = await fetchWorkspace(workspaceId);
  const duplicate = findDuplicate({ title: url, doi: resolved.doi ?? null }, workspace.papers);
  if (duplicate) {
    releaseIngest(workspaceId, identity);
    return {
      error: "duplicate",
      detail: `This looks like "${duplicate.title}", already in this workspace.`,
      duplicate,
    };
  }

  const job = createJob({ workspaceId, source: { kind: resolved.kind, url: resolved.pdfUrl ?? url, doi: resolved.doi } });

  // Issue #236: a DOI used to create a job and immediately fail it, so the
  // form offered a path guaranteed not to work. Unpaywall turns the DOI into
  // an open-access PDF url, after which this is just the direct-PDF path
  // below and needs no separate branch. A DOI with no free copy (or a
  // deployment with no resolver configured) still fails, but now with a
  // reason the reader can act on.
  let pdfUrl = resolved.pdfUrl;
  if (resolved.kind === "doi") {
    const resolution = await resolveDoiToPdfUrl(resolved.doi!);
    if (!resolution.ok) {
      failJob(job.id, resolution.reason);
      releaseIngest(workspaceId, identity);
      return { jobId: job.id, source: resolved };
    }
    pdfUrl = resolution.pdfUrl;
  }

  void (async () => {
    try {
      const res = await fetch(pdfUrl!);
      if (!res.ok) throw new Error(`Fetching the PDF failed (${res.status}).`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      // Issue #170: this path used to skip validateUpload() entirely -- the
      // multipart upload route runs it, but a pasted URL went straight into
      // runIngest with no size/magic-bytes/page-count/text-layer check at
      // all. A 500MB or 1000-page URL got fetched in full into memory and
      // piped straight into scripts/parse.py, which then failed with a raw
      // Python OOM/stderr crash instead of the clean, named rejection §6
      // requires everywhere else.
      const validation = validateUpload(bytes);
      if (!validation.ok) {
        failJob(job.id, validation.message ?? "That file can't be processed.");
        return;
      }

      await runIngest({ jobId: job.id, workspaceId, paperTitle: url, sourceUrl: resolved.pdfUrl ?? url, bytes });
    } catch (err) {
      failJob(job.id, err instanceof Error ? err.message : String(err));
    } finally {
      releaseIngest(workspaceId, identity);
    }
  })();

  return { jobId: job.id, source: resolved };
}
