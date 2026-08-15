import { getAdapter } from "@/lib/data/adapter";
import { seedCatalogStats } from "@/lib/data/seed";
import { FeedClient, type FeedItem } from "@/components/discover/FeedClient";

export default async function DiscoverPage() {
  const papers = await getAdapter().listCatalog();

  // Engagement is derived from the paper id, so it is identical on the server
  // and on the client and does not reshuffle between renders.
  const items: FeedItem[] = papers.map((p) => ({
    ...p,
    stats: seedCatalogStats(p.id, p.year),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-s-7">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Discover
        </p>
        <h1 className="mt-s-3 font-serif text-3xl leading-tight text-ink">
          The public library
        </h1>
        <p className="mt-s-3 font-sans text-base leading-relaxed text-ink-muted">
          Open-access papers posted on Pepiros. Every one opens into a grounded
          summary where each claim sits next to the sentence it came from.
        </p>
      </header>

      <div className="mt-s-6">
        <FeedClient items={items} />
      </div>
    </main>
  );
}
