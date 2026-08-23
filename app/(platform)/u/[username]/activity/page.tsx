import type { Metadata } from "next";
import { PaperRow } from "@/components/profile/PaperRow";
import { UserProfile, postedOn, resolveProfile } from "../profile-shared";

export const metadata: Metadata = { title: "Recent activity" };

/** /u/[username] Recent activity: posts grouped by day, newest first. */
export default async function ProfileActivityTab({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { papers } = await resolveProfile(username);

  const byDay = new Map<string, typeof papers>();
  for (const p of papers) {
    const day = postedOn(p.stats.postedDaysAgo);
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <UserProfile username={username} activeHref={`/u/${username}/activity`}>
      {days.length === 0 ? (
        <p className="font-sans text-sm text-ink-faint">No activity yet.</p>
      ) : (
        <ol className="space-y-s-6">
          {days.map((day) => {
            const posted = byDay.get(day) ?? [];
            return (
              <li key={day}>
                <div className="flex items-baseline gap-s-3 border-b border-border pb-s-2">
                  <h2 className="font-mono text-sm text-ink">{day}</h2>
                  <p className="font-sans text-sm text-ink-muted">
                    Posted {posted.length} {posted.length === 1 ? "paper" : "papers"}
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {posted.map((p) => (
                    <PaperRow key={p.id} paper={p} dateLabel={`Posted ${day}`} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </UserProfile>
  );
}
