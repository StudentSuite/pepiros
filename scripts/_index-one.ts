import "server-only";
import { CATALOG } from "@/lib/data/papers";
import { resolveSourceUrl, validateUpload } from "@/lib/services/upload";
import { runIngest } from "@/lib/services/ingest";
import { createWorkspace } from "@/lib/services/workspaces";
import { createJob, getJob } from "@/lib/services/jobs";
import { fetchWorkspace } from "@/lib/services/workspace";
import { upsertIndexedCatalogEntry, getIndexedCatalogEntries } from "@/lib/db/queries";

async function main() {
  const slug = process.argv[2];
  const paper = CATALOG.find((p) => p.slug === slug);
  if (!paper) throw new Error(`no catalog paper with slug ${slug}`);

  const already = (await getIndexedCatalogEntries()).find((e) => e.slug === slug);
  if (already) {
    console.log(`${slug} already indexed -> ${already.workspaceId}`);
    return;
  }

  const pdfUrl = resolveSourceUrl(paper.sourceUrl).pdfUrl;
  if (!pdfUrl) throw new Error(`no directly fetchable PDF from ${paper.sourceUrl}`);

  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`fetching the PDF returned ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());

  const validation = validateUpload(bytes);
  if (!validation.ok) throw new Error(validation.message ?? "failed upload validation");

  const workspace = await createWorkspace(paper.title, null);
  const job = createJob({ workspaceId: workspace.id, source: { kind: "catalog", url: pdfUrl, slug: paper.slug } });

  await runIngest({ jobId: job.id, workspaceId: workspace.id, paperTitle: paper.title, sourceUrl: paper.sourceUrl, bytes });

  const finished = getJob(job.id);
  if (finished?.status === "failed") {
    throw new Error((finished.error ?? "unknown error").split("\n")[0]);
  }

  const result = await fetchWorkspace(workspace.id);
  if (result.papers.length === 0 || result.chunks.length === 0) {
    throw new Error("ingest finished but wrote no paper or chunks");
  }

  await upsertIndexedCatalogEntry({ slug: paper.slug, workspaceId: workspace.id, paperId: result.papers[0]!.id });

  console.log(
    `indexed ${slug} -> ${workspace.id} (${result.chunks.length} chunks, ${result.nodes.length} nodes, ${result.evidence.length} evidence)`,
  );
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
