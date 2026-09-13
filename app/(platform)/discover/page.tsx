import { getAdapter } from "@/lib/data/adapter";
import { seedCatalogStats } from "@/lib/data/seed";
import { fetchWorkspace } from "@/lib/services/workspace";
import { FeedClient, type FeedEntry, type FeedGrounding } from "@/components/discover/FeedClient";
import { ReadingColumn } from "@/components/reading/Article";
import type { Workspace } from "@/types/anchor";
import type { EvidenceTier } from "@/types/anchor";

// The feed surfaces live indexed-catalog and grounding state that a cron
// writes at runtime, and the build sandbox cannot reach the database anyway
// (issue #409's live deploys hit ENETUNREACH against a configured
// DATABASE_URL over IPv6). Baking /discover at deploy time would either fail
// the build or freeze the grounding badges -- so it renders on demand, where
// the function runtime can actually reach Supabase.
export const dynamic = "force-dynamic";

/**
 * A DB read for a grounding badge must never cost the whole discover page --
 * the same contract lib/services/catalogWorkspaces.ts documents for the
 * catalog lookup ("A missing workspace id costs a reader one link; a thrown
 * error costs them the whole page"). Since issue #409, fetchWorkspace()
 * throws instead of silently swapping in the fixture when the database is
 * configured but broken -- the exact failure an unreachable build sandbox
 * used to hit (and the page was being prerendered at deploy time, so it
 * failed the build). Grounding being unavailable keeps the paper and drops
 * the badge, which FeedClient already renders as the honest "not yet
 * indexed" state -- never a zero, and never the sample graph.
 */
async function tryFetchWorkspace(workspaceId: string): Promise<Workspace | null> {
  try {
    return await fetchWorkspace(workspaceId);
  } catch (err) {
    console.error(`[discover] fetchWorkspace(${workspaceId}) unavailable, grounding omitted:`, err);
    return null;
  }
}

async function realGrounding(workspaceId: string | undefined): Promise<FeedGrounding | null> {
  if (!workspaceId) return null;
  const workspace = await tryFetchWorkspace(workspaceId);
  if (!workspace) return null;
  const total = workspace.evidence.length;
  if (total === 0) return null;

  const counts: Record<EvidenceTier, number> = { quote_located: 0, paraphrase: 0, unsupported: 0 };
  for (const e of workspace.evidence) counts[e.tier]++;
  const dominantTier = (Object.keys(counts) as EvidenceTier[]).reduce((a, b) =>
    counts[b] > counts[a] ? b : a,
  );

  return { claimCount: total, dominantTier };
}

export default async function DiscoverPage() {
  const papers = await getAdapter().listCatalog();

  // Engagement is derived from the paper id, so it is identical on the server
  // and on the client and does not reshuffle between renders.
  const items: FeedEntry[] = await Promise.all(
    papers.map(async (p) => ({
      ...p,
      stats: seedCatalogStats(p.id, p.year),
      grounding: await realGrounding(p.workspaceId),
    })),
  );

  return (
    <main className="pb-s-5">
      <ReadingColumn wide>
        <header className="border-b border-border py-s-7 text-center">
          <h1 className="font-sans font-bold text-[2rem] leading-tight text-ink sm:text-[2.4rem]">
            Discover
          </h1>
          <p className="mx-auto mt-s-3 max-w-md font-sans text-base leading-relaxed text-ink-muted">
            Open-access papers, read closely. Every claim sits next to the
            sentence it came from, or says plainly that it has none.
          </p>
        </header>

        <div className="pt-s-5">
          <FeedClient items={items} />
        </div>
      </ReadingColumn>
    </main>
  );
}
