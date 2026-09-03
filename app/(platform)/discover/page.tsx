import { getAdapter } from "@/lib/data/adapter";
import { seedCatalogStats } from "@/lib/data/seed";
import { fetchWorkspace } from "@/lib/services/workspace";
import { FeedClient, type FeedEntry, type FeedGrounding } from "@/components/discover/FeedClient";
import { ReadingColumn } from "@/components/reading/Article";
import type { EvidenceTier } from "@/types/anchor";

/**
 * Real claim count and a dominant grounding tier for an indexed paper
 * (issue #299): the row used to show fabricated "readers"/comments seed
 * stats where the plan wants claim count and evidence tier -- real numbers,
 * not a restyle of fake ones. Only computed for a paper with a real
 * workspaceId; an unindexed paper gets an honest "not yet indexed" state
 * from FeedClient rather than a zero or an invented figure.
 */
async function realGrounding(workspaceId: string | undefined): Promise<FeedGrounding | null> {
  if (!workspaceId) return null;
  const workspace = await fetchWorkspace(workspaceId);
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
