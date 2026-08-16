// Runs the real parse -> generate -> verify pipeline against a directory of
// PDFs and reports the dropped-anchor rate, hallucinated-ref count, and a
// per-generator breakdown (docs/PLAN-V1.md §4.5, §16.1: "Never quote a
// drop-rate number on stage that has not been measured.").
//
// Usage:
//   npx tsx --env-file=.env --conditions=react-server scripts/measure-drop-rate.ts [dir]
// Defaults to evals/golden-papers/ (gitignored -- see that directory's
// README for what to put there; this repo ships no PDFs, per the same
// convention as fixtures/*.pdf).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runPythonScript } from "@/lib/services/pythonRunner";

interface ParsedChunk {
  page: number;
  kind: string;
  text: string;
  sectionIndex: number | null;
  rects: Array<{ page: number; x0: number; y0: number; x1: number; y1: number }>;
}
interface ParsedDocument {
  title: string | null;
  sections: Array<{ title: string; order: number }>;
  chunks: ParsedChunk[];
  numerics: Array<{ chunkIndex: number; rawText: string; value: number; unit: string | null; comparator: string | null; role: string }>;
  references: Array<{ rawText: string; doi: string | null }>;
  pageCount: number;
}

function runParsePy(pdfPath: string): Promise<ParsedDocument> {
  return runPythonScript<ParsedDocument>(path.join(process.cwd(), "scripts", "parse.py"), [pdfPath]);
}

interface PaperResult {
  file: string;
  totalClaims: number;
  dropped: number;
  hallucinatedRefs: number;
  numericFailures: number;
  byGenerator: Record<string, { total: number; dropped: number }>;
}

async function measureOne(pdfPath: string): Promise<PaperResult> {
  const { runOrchestrator } = await import("@/lib/agents/orchestrator");

  const bytes = readFileSync(pdfPath);
  const tmpPath = path.join(tmpdir(), `pepiros-eval-${randomUUID()}.pdf`);
  writeFileSync(tmpPath, bytes);
  const parsed = await runParsePy(tmpPath);

  const paperId = `eval-${randomUUID().slice(0, 8)}`;
  let chunkOrdinal = 0;
  const chunks = parsed.chunks.map((c, i) => ({
    id: `${paperId}-c${i + 1}`,
    paperId,
    sectionId: c.sectionIndex !== null ? `${paperId}-s${c.sectionIndex}` : null,
    kind: (["prose", "figure_caption", "table", "equation"].includes(c.kind) ? c.kind : "prose") as
      | "prose"
      | "figure_caption"
      | "table"
      | "equation",
    page: c.page,
    text: c.text,
    ordinal: ++chunkOrdinal,
    rects: c.rects,
  }));

  let numericOrdinal = 0;
  const numerics = parsed.numerics
    .map((n) => {
      const chunk = chunks[n.chunkIndex];
      if (!chunk) return null;
      return {
        id: `${paperId}-n${++numericOrdinal}`,
        chunkId: chunk.id,
        rawText: n.rawText,
        value: n.value,
        unit: n.unit,
        comparator: n.comparator as "=" | "<" | ">" | "<=" | ">=" | "~" | null,
        ordinal: numericOrdinal,
        role: n.role,
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  const result = await runOrchestrator({
    workspaceId: "eval",
    paperId,
    paperTitle: parsed.title || path.basename(pdfPath),
    chunks,
    numerics,
  });

  const byGenerator: Record<string, { total: number; dropped: number }> = {};
  let totalClaims = 0;
  let dropped = 0;
  let hallucinatedRefs = 0;
  let numericFailures = 0;

  for (const leaf of result.leaves) {
    if (leaf.status !== "ok" || !leaf.evidence) continue;
    const bucket = byGenerator[leaf.generator] ?? { total: 0, dropped: 0 };
    for (const ev of leaf.evidence) {
      totalClaims++;
      bucket.total++;
      if (ev.tier === "unsupported") {
        dropped++;
        bucket.dropped++;
      }
      if (ev.numericOk === false) numericFailures++;
      // hallucinated_ref isn't carried on the persisted Evidence row (it's a
      // verification-time signal, not a stored fact) -- an unsupported claim
      // whose refId never resolved to a real chunk is the closest proxy
      // available post hoc without re-plumbing verifyClaimsAgainstCorpus's
      // richer VerifiedClaim shape through the orchestrator.
      if (ev.tier === "unsupported" && !ev.anchor && ev.matchScore === 0) hallucinatedRefs++;
    }
    byGenerator[leaf.generator] = bucket;
  }

  return { file: path.basename(pdfPath), totalClaims, dropped, hallucinatedRefs, numericFailures, byGenerator };
}

async function main() {
  const dir = process.argv[2] ?? path.join(process.cwd(), "evals", "golden-papers");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  } catch {
    console.error(`No directory at ${dir}. See evals/golden-papers/README.md for what to put there.`);
    process.exit(2);
  }
  if (files.length === 0) {
    console.error(`${dir} has no PDFs. See evals/golden-papers/README.md.`);
    process.exit(2);
  }

  const results: PaperResult[] = [];
  for (const file of files) {
    console.log(`Measuring ${file}...`);
    try {
      results.push(await measureOne(path.join(dir, file)));
    } catch (err) {
      console.error(`  failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const totalClaims = results.reduce((s, r) => s + r.totalClaims, 0);
  const totalDropped = results.reduce((s, r) => s + r.dropped, 0);
  const totalHallucinated = results.reduce((s, r) => s + r.hallucinatedRefs, 0);
  const totalNumericFailures = results.reduce((s, r) => s + r.numericFailures, 0);

  const byGenerator: Record<string, { total: number; dropped: number }> = {};
  for (const r of results) {
    for (const [gen, b] of Object.entries(r.byGenerator)) {
      const bucket = byGenerator[gen] ?? { total: 0, dropped: 0 };
      bucket.total += b.total;
      bucket.dropped += b.dropped;
      byGenerator[gen] = bucket;
    }
  }

  console.log("\n=== Drop-rate report ===");
  console.log(`Papers measured: ${results.length} (of ${files.length} found)`);
  console.log(`Total claims: ${totalClaims}`);
  console.log(`Dropped (unsupported): ${totalDropped} (${totalClaims ? ((totalDropped / totalClaims) * 100).toFixed(1) : "0.0"}%)`);
  console.log(`Hallucinated refs (proxy): ${totalHallucinated}`);
  console.log(`Numeric-floor failures: ${totalNumericFailures}`);
  console.log("\nPer generator:");
  for (const [gen, b] of Object.entries(byGenerator).sort()) {
    const rate = b.total ? ((b.dropped / b.total) * 100).toFixed(1) : "0.0";
    const flag = Number(rate) > 10 ? "  <-- above 10%, per §16.1 rewrite this prompt to cite spans rather than paraphrase" : "";
    console.log(`  ${gen.padEnd(24)} ${b.dropped}/${b.total} (${rate}%)${flag}`);
  }

  const outDir = path.join(process.cwd(), "evals", "results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `drop-rate-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify({ results, totalClaims, totalDropped, totalHallucinated, totalNumericFailures, byGenerator }, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
