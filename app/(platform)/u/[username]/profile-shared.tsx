import { cache } from "react";
import { notFound } from "next/navigation";
import { CalendarDays, FileText, UserRound } from "lucide-react";
import { getAdapter } from "@/lib/data/adapter";
import { getSession } from "@/lib/auth/session";
import { seedCatalogStats } from "@/lib/data/seed";
import { CATALOG, type CatalogPaper } from "@/lib/data/papers";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { FollowButton } from "./FollowButton";

/**
 * Shared resolution and chrome for /u/[username], so each tab route renders
 * the same identity block without restating the real-account-vs-persona logic.
 *
 * Following and Followers tabs are deliberately absent. The data adapter
 * exposes getFollowState() (a count and a boolean) but nothing that lists
 * follower or followee rows, so those tabs cannot be populated without new
 * adapter methods and queries. A tab that always renders empty is worse than
 * no tab.
 */

/**
 * Turn seedCatalogStats' `postedDaysAgo` into a local ISO date.
 *
 * Local-time construction, not `toISOString()`, which would shift the day in
 * any timezone behind UTC and land posts on the wrong calendar cell.
 */
export function postedOn(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Papers a given handle has posted, derived from the same seed as the feed. */
export function papersBy(username: string): (CatalogPaper & { stats: ReturnType<typeof seedCatalogStats> })[] {
  return CATALOG.map((p) => ({ ...p, stats: seedCatalogStats(p.id, p.year) })).filter(
    (p) => p.stats.postedBy === username
  );
}

/**
 * Fixed illustrative catalog personas. Marketing content, not real accounts,
 * with "guest" the one entry that is both.
 */
export const DISPLAY: Record<string, { name: string; bio: string }> = {
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

/**
 * The username -> profile lookup, request-deduped.
 *
 * generateMetadata and the page body are two separate passes over the same
 * request and both have to answer "is this a real account", so this ran twice
 * per view before. Exported so page.tsx can use it in generateMetadata rather
 * than reaching for the adapter directly, which is what made the second call
 * uncached in the first place.
 *
 * cache() scopes the memo to one request, which is the right lifetime for a
 * read whose result decides a 404: a longer-lived cache would keep serving
 * "not found" to a user who signed up thirty seconds ago.
 */
export const getProfileByUsername = cache(async function getProfileByUsername(username: string) {
  return getAdapter().getProfileByUsername(username);
});

/**
 * A username is real precisely when getProfileByUsername() finds it. DISPLAY is
 * not an allowlist of real users: treating it as one previously 404'd genuine
 * signed-up accounts, and dropping the check entirely made /u/anything render
 * as a real profile. Both must pass through, and neither alone is enough.
 *
 * REQUEST-DEDUPED. Every tab route calls this once for its own data and again
 * through <UserProfile> for the identity rail, so uncached it did the whole
 * resolution -- profile lookup, session read, follow state -- twice per view.
 */
export const resolveProfile = cache(async function resolveProfile(username: string) {
  const adapter = getAdapter();
  const profile = await getProfileByUsername(username);
  const who = DISPLAY[username];
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

  // Real follower state only applies to a real account. A catalog persona with
  // no profile row keeps the illustrative count and FollowButton's local-only
  // toggle.
  let followers = 100 + papers.length * 37;
  let followState:
    | { followeeId: string; username: string; initiallyFollowing: boolean }
    | undefined;
  if (profile) {
    const viewer = await getSession();
    const follow = await adapter.getFollowState(profile.id, viewer?.id ?? null);
    followers = follow.followerCount;
    followState = {
      followeeId: profile.id,
      username,
      initiallyFollowing: follow.following,
    };
  }

  return { profile, who, displayName, bio, papers, initials, followers, followState };
});

export async function UserProfile({
  username,
  activeHref,
  children,
}: {
  username: string;
  activeHref: string;
  children: React.ReactNode;
}) {
  const { displayName, bio, papers, initials, followers, followState } =
    await resolveProfile(username);

  return (
    <ProfileShell
      name={displayName}
      handle={`@${username}`}
      bio={bio || undefined}
      activeHref={activeHref}
      avatar={
        <Avatar className="size-full rounded-none">
          <AvatarFallback className="rounded-none bg-subtle font-mono text-base text-ink-muted lg:text-3xl">
            {initials}
          </AvatarFallback>
        </Avatar>
      }
      action={<FollowButton real={followState} />}
      tabs={[
        { href: `/u/${username}`, label: "Overview" },
        { href: `/u/${username}/papers`, label: "Papers", count: papers.length },
        { href: `/u/${username}/activity`, label: "Recent activity" },
      ]}
      meta={[
        { icon: <UserRound className="size-4" />, label: `${followers.toLocaleString()} followers` },
        { icon: <FileText className="size-4" />, label: `${papers.length} posted` },
        { icon: <CalendarDays className="size-4" />, label: "Reads and publishes on Pepiros" },
      ]}
    >
      {children}
    </ProfileShell>
  );
}
