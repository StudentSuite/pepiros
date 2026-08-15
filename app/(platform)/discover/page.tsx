import { getAdapter } from "@/lib/data/adapter";
import { seedCatalogStats } from "@/lib/data/seed";
import { FeedClient, type FeedEntry } from "@/components/discover/FeedClient";
import { ReadingColumn } from "@/components/reading/Article";

export default async function DiscoverPage() {
  const papers = await getAdapter().listCatalog();

  // Engagement is derived from the paper id, so it is identical on the server
  // and on the client and does not reshuffle between renders.
  const items: FeedEntry[] = papers.map((p) => ({
    ...p,
    stats: seedCatalogStats(p.id, p.year),
  }));

  return (
    <main className="pb-s-8">
      <ReadingColumn wide>
        <header className="border-b border-border py-s-7 text-center">
          <h1 className="font-serif text-[2rem] leading-tight text-ink sm:text-[2.4rem]">
            The Library
          </h1>
          <p className="mx-auto mt-s-3 max-w-md font-sans text-[15px] leading-relaxed text-ink-muted">
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
