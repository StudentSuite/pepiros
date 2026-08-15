import "server-only";
import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Chunk, GraphEdge, GraphNode, Numeric, Paper, Workspace } from "@/types/anchor";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { fetchWorkspace } from "./workspace";
import { getIngestedWorkspace, setIngestedWorkspace } from "./ingestStore";
import { appendEvent, failJob } from "./jobs";

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
  sections: Array<{ title: string; order: number }>;
  chunks: ParsedChunk[];
  numerics: ParsedNumeric[];
  references: Array<{ rawText: string; doi: string | null }>;
  pageCount: number;
}

function runParsePy(pdfPath: string): Promise<ParsedDocument> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [path.join(process.cwd(), "scripts", "parse.py"), pdfPath]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", (err) =>
      reject(new Error(`Could not run scripts/parse.py (is python3 + pymupdf installed?): ${err.message}`)),
    );
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `scripts/parse.py exited with code ${code}.`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as ParsedDocument);
      } catch (err) {
        reject(new Error(`scripts/parse.py produced invalid JSON: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  });
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

  try {
    await writeFile(tmpPath, input.bytes);

    appendEvent(input.jobId, "Extracting text", "Running PyMuPDF extraction.");
    const parsed = await runParsePy(tmpPath);

    appendEvent(
      input.jobId,
      "Finding sections",
      `Found ${parsed.sections.length} sections across ${parsed.pageCount} pages.`,
    );

    const base = getIngestedWorkspace(input.workspaceId) ?? (await fetchWorkspace(input.workspaceId));
    const paperId = `paper-${randomUUID().slice(0, 8)}`;
    const workspaceId = input.workspaceId;
    // The PDF's own embedded title, when present, is more trustworthy than a
    // guess derived from the uploaded filename or a pasted URL.
    const paperTitle = parsed.title || input.paperTitle;

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

    const paper: Paper = {
      id: paperId,
      workspaceId,
      title: paperTitle,
      authors: [],
      year: null,
      archetype: null,
      sourceUrl: input.sourceUrl,
      pdfStoragePath: null,
    };

    appendEvent(input.jobId, "Reading methods", "Classifying archetype and planning pillars.");
    const result = await runOrchestrator({ workspaceId, paperId, paperTitle, chunks, numerics });

    appendEvent(input.jobId, "Planning your workspace", `Planned ${result.pillarPlan.pillars.length} pillars.`);

    const okLeaves = result.leaves.filter(
      (l): l is typeof l & { node: GraphNode; evidence: NonNullable<(typeof l)["evidence"]> } =>
        l.status === "ok" && Boolean(l.node),
    );
    appendEvent(
      input.jobId,
      "Writing notes",
      `Generated ${okLeaves.length} of ${result.leaves.length} notes (${result.leaves.length - okLeaves.length} skipped or failed).`,
    );

    appendEvent(input.jobId, "Locating anchors", "Verifying every claim against the source.");

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

    const merged: Workspace = {
      id: workspaceId,
      name: base.name,
      papers: [...base.papers, paper],
      chunks: [...base.chunks, ...chunks],
      numerics: [...base.numerics, ...numerics],
      nodes: [...base.nodes, paperNode, ...result.pillarNodes, ...okLeaves.map((l) => l.node)],
      edges: [...base.edges, ...edges],
      evidence: [...base.evidence, ...okLeaves.flatMap((l) => l.evidence)],
    };

    setIngestedWorkspace(merged);
    appendEvent(
      input.jobId,
      "Ready",
      `"${paperTitle}" is ready: ${okLeaves.length} notes across ${result.pillarNodes.length} pillars.`,
    );
  } catch (err) {
    failJob(input.jobId, err instanceof Error ? err.message : String(err));
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
