import "server-only";
import type { CatalogPaper } from "@/lib/data/papers";
import { getIndexedCatalogEntries } from "@/lib/db/queries";

/**
 * Attaches the indexed workspace id to catalog papers (issue #279).
 *
 * `CatalogPaper.workspaceId` describes whether this deployment has actually
 * turned a paper into a graph, which is runtime state rather than something
 * checked into lib/data/papers.ts. The cron writes an `indexed_catalog` row
 * (lib/services/catalogIndexer.ts) and this reads it back, so /paper/[slug]
 * and /discover start offering "Open in reader" the moment a paper is
 * indexed, with no deploy and no source edit.
 *
 * Never throws. If the database is unreachable, every paper simply reports as
 * not-yet-indexed, which is the honest not-indexed state those pages already
 * render (issue #281) rather than an error page. A missing workspace id
 * costs a reader one link; a thrown error costs them the whole page.
 */
async function indexedBySlug(): Promise<Map<string, string>> {
  try {
    const entries = await getIndexedCatalogEntries();
    return new Map(entries.map((e) => [e.slug, e.workspaceId]));
  } catch (err) {
    console.error("[catalogWorkspaces] getIndexedCatalogEntries() unavailable:", err);
    return new Map();
  }
}

export async function withIndexedWorkspaces(papers: CatalogPaper[]): Promise<CatalogPaper[]> {
  const indexed = await indexedBySlug();
  if (indexed.size === 0) return papers;
  return papers.map((p) => {
    const workspaceId = indexed.get(p.slug);
    return workspaceId ? { ...p, workspaceId } : p;
  });
}

export async function withIndexedWorkspace(paper: CatalogPaper | null): Promise<CatalogPaper | null> {
  if (!paper) return null;
  const [withId] = await withIndexedWorkspaces([paper]);
  return withId ?? paper;
}
