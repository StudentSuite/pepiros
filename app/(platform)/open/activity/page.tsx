import type { Metadata } from "next";
import { CATALOG, paperAddedAt } from "@/lib/data/papers";
import { withIndexedWorkspaces } from "@/lib/services/catalogWorkspaces";
import { PaperRow } from "@/components/profile/PaperRow";
import { OpenProfile } from "../OpenProfile";

export const metadata: Metadata = {
  title: "Recent activity / Open",
  description: "What was added to the public Pepiros catalog, and when.",
};

/**
 * /open Recent activity: additions grouped by the day they landed, newest
 * first, mirroring GitHub's dated activity feed.
 */
export default async function OpenActivityTab() {
  const papers = await withIndexedWorkspaces(CATALOG);

  const byDay = new Map<string, typeof papers>();
  for (const p of papers) {
    const day = paperAddedAt(p);
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <OpenProfile activeHref="/open/activity">
      {days.length === 0 ? (
        <p className="font-sans text-sm text-ink-muted">Nothing added yet.</p>
      ) : (
        <ol className="space-y-s-6">
          {days.map((day) => {
            const added = byDay.get(day) ?? [];
            return (
              <li key={day}>
                <div className="flex items-baseline gap-s-3 border-b border-border pb-s-2">
                  <h2 className="font-mono text-sm text-ink">{day}</h2>
                  <p className="font-sans text-sm text-ink-muted">
                    Added {added.length} {added.length === 1 ? "paper" : "papers"}
                  </p>
                </div>
                <ul className="divide-y divide-border">
                  {added.map((paper) => (
                    <PaperRow key={paper.id} paper={paper} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </OpenProfile>
  );
}
