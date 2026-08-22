/**
 * Puts catalog papers through the real ingest pipeline (issue #279).
 *
 * WHY THIS EXISTS. `CatalogPaper` (lib/data/papers.ts) carries id, slug,
 * title, authors, year, venue, field, licence and sourceUrl. That is a
 * bibliography row: no chunks, no evidence, no nodes, no workspace. Twenty-
 * four real papers, none ever put through the pipeline, because ingest needs
 * a local Python interpreter and nobody ran it over the catalog. lib/data/
 * paperContent.ts was then written to synthesise an article shape so the
 * pages had something to render, and that synthetic layer is what shipped
 * (issue #253, now removed).
 *
 * This is the real fix, and #253's proper resolution (#283) depends on it:
 * once a catalog paper has a workspace, /paper/[slug] can read the same nodes
 * and evidence rows the reader reads instead of generating anything.
 *
 * HOW TO RUN. Local only, and deliberately so: the parse step shells out to
 * scripts/parse.py, and no hosted Node runtime has a Python interpreter
 * (issue #295). Point DATABASE_URL at the target project and run:
 *
 *   npx tsx --env-file=.env --conditions=react-server scripts/index-catalog.ts
 *
 * Flags:
 *   --limit=N     stop after N newly-indexed papers (default 10)
 *   --slug=SLUG   index exactly one paper, by slug
 *   --dry-run     resolve and report, fetch and ingest nothing
 *
 * IDEMPOTENT. A paper with `workspaceId` already set is skipped, so a re-run
 * after a partial failure continues rather than duplicating work. The script
 * prints the `workspaceId` mapping at the end; writing it back into
 * lib/data/papers.ts is a deliberate manual step, because that file is
 * source, not a cache, and a script silently rewriting checked-in data is how
 * you lose track of what is real.
 *
 * ONLY OPEN-ACCESS PAPERS ARE FETCHED. `isFetchableLicence` gates on the
 * licence recorded in the catalog, so a paywalled or unverified entry is
 * skipped rather than scraped. Ingesting something we have no right to
 * redistribute would be a worse failure than an unindexed paper.
 */
import { CATALOG, isFetchableLicence, type CatalogPaper } from "../lib/data/papers";
import { resolveSourceUrl } from "../lib/services/upload";
import { runIngest } from "../lib/services/ingest";
import { createWorkspace } from "../lib/services/workspaces";
import { validateUpload } from "../lib/services/upload";
import { createJob, getJob } from "../lib/services/jobs";
import { fetchWorkspace } from "../lib/services/workspace";

interface Args {
  limit: number;
  slug: string | null;
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  return {
    // Ten by default, matching the issue: start with the papers /discover
    // actually surfaces rather than all twenty-four.
    limit: Number(get("limit") ?? 10),
    slug: get("slug"),
    dryRun: argv.includes("--dry-run"),
  };
}

/**
 * A PDF url we can fetch without a resolver hop.
 *
 * arXiv is a pure abs -> pdf rewrite. PMC and DOI both need a network
 * resolution step that runIngest's URL path owns, and this script deliberately
 * does not reimplement: an entry that needs one is reported as needing manual
 * attention rather than half-resolved here.
 */
function directPdfUrl(paper: CatalogPaper): string | null {
  const resolved = resolveSourceUrl(paper.sourceUrl);
  return resolved.pdfUrl ?? null;
}

async function indexOne(paper: CatalogPaper, dryRun: boolean): Promise<string | null> {
  const pdfUrl = directPdfUrl(paper);
  if (!pdfUrl) {
    console.log(`  skip: no directly fetchable PDF from ${paper.sourceUrl}`);
    return null;
  }
  if (dryRun) {
    console.log(`  would fetch ${pdfUrl}`);
    return null;
  }

  const res = await fetch(pdfUrl);
  if (!res.ok) {
    console.log(`  skip: fetching ${pdfUrl} returned ${res.status}`);
    return null;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());

  // The same validation the upload route runs. A catalog entry is not exempt
  // from the page cap or the text-layer check: a scanned PDF would sail past
  // parse.py and produce an empty graph that looks indexed.
  const validation = validateUpload(bytes);
  if (!validation.ok) {
    console.log(`  skip: ${validation.message ?? "failed upload validation"}`);
    return null;
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

  // runIngest reports failure by calling failJob() on its own in-memory job
  // rather than by throwing, so awaiting it successfully says nothing about
  // whether anything was written. Without this check the first run of this
  // script reported "indexed 11, failed 0" while every workspace was empty:
  // the parse had died on a missing optional dependency and the script had no
  // way to know. Read the job back, and treat a real result as the only
  // success.
  const finished = getJob(job.id);
  if (finished?.status === "failed") {
    const reason = (finished.error ?? "unknown error").split("\n")[0];
    console.log(`  failed: ${reason}`);
    return null;
  }

  const result = await fetchWorkspace(workspace.id);
  if (result.papers.length === 0 || result.chunks.length === 0) {
    console.log("  failed: ingest finished but wrote no paper or chunks");
    return null;
  }
  console.log(
    `  ${result.chunks.length} chunks, ${result.nodes.length} nodes, ${result.evidence.length} evidence`,
  );

  return workspace.id;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const candidates = CATALOG.filter((p) => {
    if (args.slug) return p.slug === args.slug;
    if (p.workspaceId) return false;
    return isFetchableLicence(p.licence);
  });

  if (candidates.length === 0) {
    console.log("Nothing to index: every eligible catalog paper already has a workspace.");
    return;
  }

  console.log(
    `${candidates.length} candidate(s), indexing up to ${args.limit}${args.dryRun ? " (dry run)" : ""}.\n`,
  );

  const indexed: Array<{ slug: string; workspaceId: string }> = [];
  const failed: string[] = [];

  for (const paper of candidates) {
    if (indexed.length >= args.limit) break;
    console.log(`${paper.slug} (${paper.licence})`);
    try {
      const workspaceId = await indexOne(paper, args.dryRun);
      if (workspaceId) {
        indexed.push({ slug: paper.slug, workspaceId });
        console.log(`  indexed -> ${workspaceId}`);
      }
    } catch (err) {
      // One bad paper must not abandon the rest of the run: this takes real
      // minutes per paper and a mid-run abort wastes all of it.
      failed.push(paper.slug);
      console.error(`  failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nIndexed ${indexed.length}, failed ${failed.length}.`);
  if (failed.length > 0) console.log(`Failed: ${failed.join(", ")}`);

  if (indexed.length > 0) {
    console.log("\nAdd these to lib/data/papers.ts (workspaceId on the matching entry):\n");
    for (const { slug, workspaceId } of indexed) {
      console.log(`  ${slug}: workspaceId: "${workspaceId}",`);
    }
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

