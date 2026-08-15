import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdapter } from "@/lib/data/adapter";
import { seedCatalogStats } from "@/lib/data/seed";
import { articleFor } from "@/lib/data/paperContent";
import { CATALOG } from "@/lib/data/papers";
import {
  Dot,
  FeedItem,
  ReadingColumn,
} from "@/components/reading/Article";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { FollowButton } from "./FollowButton";

/** Papers a given handle has posted, derived from the same seed as the feed. */
function papersBy(username: string) {
  return CATALOG.map((p) => ({ ...p, stats: seedCatalogStats(p.id, p.year) })).filter(
    (p) => p.stats.postedBy === username,
  );
}

const KNOWN = [
  "guest",
  "priyasub",
  "jonasw",
  "hanak",
  "tferreira",
  "amarao",
  "weiz",
  "eroux",
];

const DISPLAY: Record<string, { name: string; bio: string }> = {
  guest: {
    name: "Guest Reader",
    bio: "A shared demo account. Everything here is generated so you can see how a real Pepiros profile behaves without signing up.",
  },
  priyasub: {
    name: "Priya Subramaniam",
    bio: "Clinical NLP and coastal ecology. I read a lot of papers I did not write, and post the ones worth a closer look.",
  },
  jonasw: {
    name: "Jonas Weber",
    bio: "Methods first. If the design does not support the headline, the headline is not the finding.",
  },
  hanak: {
    name: "Hana Kimura",
    bio: "Sleep, circadian rhythm, and the long tail of studies nobody replicates.",
  },
  tferreira: {
    name: "Tomás Ferreira",
    bio: "Machine learning, mostly generative. Interested in what benchmarks quietly fail to measure.",
  },
  amarao: {
    name: "Amara Okafor",
    bio: "Epidemiology. Reading for the confounders everyone skips.",
  },
  weiz: {
    name: "Wei Zhang",
    bio: "Clinical trials and the gap between statistical and clinical significance.",
  },
  eroux: {
    name: "Elena Roux",
    bio: "Climate and Earth systems. Long horizons, careful claims.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const who = DISPLAY[username];
  if (!who) return { title: "Profile not found" };
  return { title: who.name, description: who.bio };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Previously this rendered the same mock profile for ANY username, so
  // /u/anything looked like a real account. Unknown handles now 404.
  if (!KNOWN.includes(username)) notFound();

  const who = DISPLAY[username];
  if (!who) notFound();

  const adapter = getAdapter();
  const profile = await adapter.getProfileByUsername(username);
  const papers = papersBy(username);
  const initials = who.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const followers = profile?.followerCount ?? 100 + papers.length * 37;

  return (
    <main className="pb-s-8">
      <ReadingColumn wide>
        {/* Publication header */}
        <header className="border-b border-border py-s-7 text-center">
          <Avatar className="mx-auto size-16">
            <AvatarFallback className="bg-subtle font-mono text-base text-ink-muted">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-s-4 font-serif text-[1.9rem] leading-tight text-ink">
            {who.name}
          </h1>
          <p className="mt-1 font-mono text-[12px] text-ink-faint">@{username}</p>

          <p className="mx-auto mt-s-4 max-w-md font-sans text-[15px] leading-relaxed text-ink-muted">
            {who.bio}
          </p>

          <div className="mt-s-5 flex items-center justify-center gap-s-3 font-sans text-[13px] text-ink-faint">
            <span>
              <span className="text-ink">{papers.length}</span> posted
            </span>
            <Dot />
            <span>
              <span className="text-ink">{followers.toLocaleString()}</span> followers
            </span>
          </div>

          <div className="mt-s-5 flex justify-center">
            <FollowButton />
          </div>
        </header>

        {papers.length === 0 ? (
          <p className="py-s-8 text-center font-sans text-[15px] text-ink-faint">
            Nothing posted yet.
          </p>
        ) : (
          <div className="pt-s-6">
            {papers.map((p) => {
              const article = articleFor(p);
              return (
                <FeedItem
                  key={p.id}
                  href={`/paper/${p.slug}`}
                  title={p.title}
                  dek={article.dek}
                  tags={
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {p.field}
                    </span>
                  }
                  meta={
                    <>
                      <span>{p.venue}</span>
                      <Dot />
                      <span>{p.year}</span>
                      <Dot />
                      <span>{article.readingMinutes} min</span>
                      <Dot />
                      <span>
                        {Math.round(p.stats.groundingCoverage * 100)}% grounded
                      </span>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </ReadingColumn>
    </main>
  );
}
