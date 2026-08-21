import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdapter } from "@/lib/data/adapter";
import { getSession } from "@/lib/auth/session";
import { seedCatalogStats } from "@/lib/data/seed";
import { paperDek } from "@/lib/data/paperContent";
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
  if (who) return { title: who.name, description: who.bio };

  // Not an illustrative catalog persona -- check for a real account before
  // giving up (same real-vs-illustrative fallback the page body itself
  // uses below).
  const profile = await getAdapter().getProfileByUsername(username);
  // Issue #257: see the note in paper/[slug]/page.tsx. The status is fixed
  // once streaming starts, so a notFound() that only runs in the page body
  // renders the right screen under a 200. The body keeps its own check: this
  // one decides the status, that one is the guard for the render path.
  if (!profile) notFound();
  return { title: profile.displayName, description: profile.bio || undefined };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const adapter = getAdapter();
  const profile = await adapter.getProfileByUsername(username);
  const who = DISPLAY[username];

  // KNOWN/DISPLAY are the fixed illustrative catalog personas (marketing
  // content, not real accounts -- "guest" is the one entry that's both).
  // Previously this rendered the same mock profile for ANY username at all,
  // so /u/anything looked like a real account; the fix for that (KNOWN-only)
  // then over-corrected the other way and 404'd every *real* signed-up
  // account too, since KNOWN was never meant to be an allowlist of real
  // users -- confirmed live: a real test account's own profile page 404'd
  // even though getProfileByUsername() found it fine. A username is real
  // precisely when adapter.getProfileByUsername() finds it; unknown handles
  // that are neither a real account nor a catalog persona still 404.
  if (!who && !profile) notFound();

  const displayName = profile?.displayName ?? who!.name;
  const bio = profile?.bio || who?.bio || "";
  const papers = papersBy(username);
  const initials =
    profile?.avatarInitials ??
    displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("");

  // Real follower/follow-state only applies to a real account; a catalog
  // persona with no profile row keeps the illustrative follower count and
  // FollowButton's prior local-only toggle.
  let followers = 100 + papers.length * 37;
  let followState: { followeeId: string; username: string; initiallyFollowing: boolean } | undefined;
  if (profile) {
    const viewer = await getSession();
    const follow = await adapter.getFollowState(profile.id, viewer?.id ?? null);
    followers = follow.followerCount;
    followState = { followeeId: profile.id, username, initiallyFollowing: follow.following };
  }

  return (
    <main className="pb-s-5">
      <ReadingColumn wide>
        {/* Publication header */}
        <header className="border-b border-border py-s-7 text-center">
          <Avatar className="mx-auto size-16">
            <AvatarFallback className="bg-subtle font-mono text-base text-ink-muted">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-s-4 font-serif text-[1.9rem] leading-tight text-ink">
            {displayName}
          </h1>
          <p className="mt-1 font-mono text-[12px] text-ink-faint">@{username}</p>

          {bio && (
            <p className="mx-auto mt-s-4 max-w-md font-sans text-[15px] leading-relaxed text-ink-muted">
              {bio}
            </p>
          )}

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
            <FollowButton real={followState} />
          </div>
        </header>

        {papers.length === 0 ? (
          <p className="py-s-8 text-center font-sans text-[15px] text-ink-faint">
            Nothing posted yet.
          </p>
        ) : (
          <div className="pt-s-6">
            {papers.map((p) => {
              return (
                <FeedItem
                  key={p.id}
                  href={`/paper/${p.slug}`}
                  title={p.title}
                  dek={paperDek(p)}
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
                      {/* Issues #253/#259: reading time and "% grounded" were
                          fabricated, not measured. */}
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
