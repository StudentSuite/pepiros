import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ContributionCalendar } from "@/components/activity/ContributionCalendar";
import { PaperRow } from "@/components/profile/PaperRow";
import {
  DISPLAY,
  UserProfile,
  getProfileByUsername,
  postedOn,
  resolveProfile,
} from "./profile-shared";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const who = DISPLAY[username];
  if (who) return { title: who.name, description: who.bio };

  // Not an illustrative catalog persona -- check for a real account before
  // giving up. Issue #257: the status is fixed once streaming starts, so a
  // notFound() that only runs in the page body renders the right screen under
  // a 200. This one decides the status, the body keeps its own guard.
  // Cached lookup, so this shares one query with the page body below
  // rather than issuing its own.
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();
  return { title: profile.displayName, description: profile.bio || undefined };
}

/** /u/[username] Overview: activity calendar plus the most recent posts. */
export default async function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { papers } = await resolveProfile(username);

  const counts = new Map<string, number>();
  for (const p of papers) {
    const day = postedOn(p.stats.postedDaysAgo);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const recent = [...papers]
    .sort((a, b) => a.stats.postedDaysAgo - b.stats.postedDaysAgo)
    .slice(0, 5);

  return (
    <UserProfile username={username} activeHref={`/u/${username}`}>
      <div className="rounded-lg border border-border bg-surface-raised p-s-5">
        <ContributionCalendar counts={counts} noun="papers" />
      </div>

      <section className="mt-s-6">
        <div className="flex items-baseline justify-between border-b border-border pb-s-2">
          <h2 className="font-sans text-base text-ink">Recently posted</h2>
          {papers.length > recent.length && (
            <Link
              href={`/u/${username}/papers`}
              className="font-sans text-sm text-accent-text transition-colors duration-fast ease-out hover:underline"
            >
              View all {papers.length}
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="py-s-6 font-sans text-sm text-ink-faint">Nothing posted yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((p) => (
              <PaperRow
                key={p.id}
                paper={p}
                dateLabel={`Posted ${postedOn(p.stats.postedDaysAgo)}`}
              />
            ))}
          </ul>
        )}
      </section>
    </UserProfile>
  );
}
