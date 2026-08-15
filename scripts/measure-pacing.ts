// Measures real stage-to-stage timing for the ingest pipeline (docs/PLAN-V1.md
// §1's pacing sequence), so components/site/PacingStrip.tsx quotes an actual
// observed run instead of invented figures. Run with:
//   npx tsx --env-file=.env scripts/measure-pacing.ts <path-to-pdf>
// (--env-file loads GROQ_API_KEY/FEATHERLESS_API_KEY from .env; Next's dev
// server does this automatically, a standalone script does not.)
import { readFileSync } from "node:fs";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("usage: npx tsx scripts/measure-pacing.ts <path-to-pdf>");
    process.exit(2);
  }

  const { createJob, getJob } = await import("@/lib/services/jobs");
  const { runIngest } = await import("@/lib/services/ingest");

  const bytes = new Uint8Array(readFileSync(pdfPath));
  const job = createJob({ workspaceId: "ws-1", source: { kind: "upload", filename: pdfPath } });

  await runIngest({ jobId: job.id, workspaceId: "ws-1", paperTitle: "Pacing measurement run", sourceUrl: null, bytes });

  const finished = getJob(job.id)!;
  const t0 = finished.events[0]!.at;
  console.log(`status: ${finished.status}`);
  console.log("stage-by-stage, relative to acceptance:");
  for (const event of finished.events) {
    console.log(`  +${((event.at - t0) / 1000).toFixed(2)}s  ${event.stage.padEnd(24)} ${event.message}`);
  }
  if (finished.error) console.log(`error: ${finished.error}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
