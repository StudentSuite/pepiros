/**
 * Runs the catalog indexer from the command line (issue #279).
 *
 * The work itself lives in lib/services/catalogIndexer.ts, shared with the
 * weekly cron at app/api/cron/index-catalog. One implementation, two
 * triggers: a scheduled run and a manual one must not be able to drift into
 * indexing papers differently.
 *
 * LOCAL ONLY, deliberately. Parsing shells out to scripts/parse.py and no
 * hosted Node runtime has a Python interpreter (issue #295), which is why the
 * cron route reports 501 there and this exists for a machine that can.
 *
 *   npm run index:catalog                 # one batch (3 papers)
 *   npm run index:catalog -- --batch=11   # a bigger bite
 *   npm run index:catalog -- --all        # keep going until nothing is left
 *   npm run index:catalog -- --slug=generative-adversarial-networks
 *                                         # one specific paper, out of
 *                                         # catalog order (see indexCatalogSlug)
 *
 * Idempotent: a paper with an `indexed_catalog` row is skipped, so a re-run
 * after a failure resumes rather than re-spending tokens.
 */
import {
  DEFAULT_BATCH_SIZE,
  indexCatalogSlug,
  pendingCatalogPapers,
  runCatalogIndexBatch,
} from "../lib/services/catalogIndexer";

function arg(name: string): string | null {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main(): Promise<void> {
  const slug = arg("slug");
  if (slug) {
    const outcome = await indexCatalogSlug(slug);
    if (outcome.status === "indexed") {
      console.log(`${outcome.slug} -> ${outcome.workspaceId} (${outcome.chunks} chunks, ${outcome.nodes} nodes, ${outcome.evidence} evidence)`);
    } else {
      console.log(`${outcome.slug}: ${outcome.status} -- ${outcome.detail}`);
    }
    return;
  }

  const all = process.argv.includes("--all");
  const parsed = Number(arg("batch"));
  const batchSize = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BATCH_SIZE;

  const pending = await pendingCatalogPapers();
  if (pending.length === 0) {
    console.log("Nothing to index: every eligible catalog paper already has a graph.");
    return;
  }
  console.log(`${pending.length} paper(s) pending. Batch size ${batchSize}${all ? ", running until done." : "."}\n`);

  let indexed = 0;
  let failed = 0;

  for (;;) {
    const result = await runCatalogIndexBatch(batchSize);
    for (const o of result.outcomes) {
      if (o.status === "indexed") {
        console.log(`  ${o.slug} -> ${o.workspaceId} (${o.chunks} chunks, ${o.nodes} nodes, ${o.evidence} evidence)`);
      } else {
        console.log(`  ${o.slug}: ${o.status} -- ${o.detail}`);
      }
    }
    indexed += result.indexed;
    failed += result.failed;

    // Stop when a batch indexes nothing, or every failure would just repeat:
    // looping on a provider that is refusing us burns the whole run.
    if (!all || result.indexed === 0 || result.remaining === 0) break;
  }

  console.log(`\nIndexed ${indexed}, failed ${failed}.`);
  console.log(`${(await pendingCatalogPapers()).length} still pending.`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
