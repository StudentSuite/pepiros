import type { Metadata } from "next";
import { PaperRow } from "@/components/profile/PaperRow";
import { UserProfile, postedOn, resolveProfile } from "../profile-shared";

export const metadata: Metadata = { title: "Papers" };

/** /u/[username] Papers: everything this handle has posted, newest first. */
export default async function ProfilePapersTab({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { papers } = await resolveProfile(username);
  const sorted = [...papers].sort(
    (a, b) => a.stats.postedDaysAgo - b.stats.postedDaysAgo
  );

  return (
    <UserProfile username={username} activeHref={`/u/${username}/papers`}>
      <h2 className="border-b border-border pb-s-2 font-sans text-base text-ink">
        {sorted.length} {sorted.length === 1 ? "paper" : "papers"}
      </h2>
      {sorted.length === 0 ? (
        <p className="py-s-6 font-sans text-sm text-ink-faint">Nothing posted yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((p) => (
            <PaperRow
              key={p.id}
              paper={p}
              dateLabel={`Posted ${postedOn(p.stats.postedDaysAgo)}`}
            />
          ))}
        </ul>
      )}
    </UserProfile>
  );
}
