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
/**
 * Deadline for the catalog lookup.
 *
 * The try/catch below is decorative without this. postgres.js parks queries on
 * an unbounded queue with no query timeout once its connections are busy or
 * half-open, so a dropped socket produces a promise that never settles and
 * never rejects: not an error, just a render that hangs forever. That is what
 * wedged the dev server twice on 2026-08-23, and it presents as the whole app
 * being down because the browser runs out of sockets waiting.
 *
 * 3s is far longer than a healthy lookup (single indexed table, tens of rows)
 * and short enough that a sick database costs a "not yet indexed" badge rather
 * than the page.
 */
const LOOKUP_TIMEOUT_MS = 3000;

async function indexedBySlug(): Promise<Map<string, string>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const entries = await Promise.race([
      getIndexedCatalogEntries(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`indexed_catalog lookup exceeded ${LOOKUP_TIMEOUT_MS}ms`)),
          LOOKUP_TIMEOUT_MS,
        );
      }),
    ]);
    return new Map(entries.map((e) => [e.slug, e.workspaceId]));
  } catch (err) {
    console.error("[catalogWorkspaces] getIndexedCatalogEntries() unavailable:", err);
    return new Map();
  } finally {
    // Promise.race does not cancel the loser. Without this the timer keeps the
    // event loop alive for the full timeout on every successful request.
    clearTimeout(timer);
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
