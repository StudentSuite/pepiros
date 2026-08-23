import type { Metadata } from "next";
import Link from "next/link";
import { CATALOG, isOpenAccess, paperAddedAt } from "@/lib/data/papers";
import { withIndexedWorkspaces } from "@/lib/services/catalogWorkspaces";
import { ContributionCalendar } from "@/components/activity/ContributionCalendar";
import { PaperRow } from "@/components/profile/PaperRow";
import { OpenProfile } from "./OpenProfile";

export const metadata: Metadata = {
  title: "Open",
  description:
    "The public Pepiros catalog: every catalogued paper with its source, licence and mindmap status.",
};

/**
 * /open Overview: the activity calendar plus the most recent additions.
 *
 * Lists the whole catalog rather than filtering by licence. Licence is shown
 * per row instead, so a paywalled paper is visible and honestly labelled
 * rather than silently missing.
 */
export default async function OpenOverviewPage() {
  const papers = await withIndexedWorkspaces(CATALOG);

  const counts = new Map<string, number>();
  for (const p of papers) {
    const day = paperAddedAt(p);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const recent = [...papers]
    .sort((a, b) => paperAddedAt(b).localeCompare(paperAddedAt(a)))
    .slice(0, 6);

  const openCount = papers.filter((p) => isOpenAccess(p.licence)).length;
  const mindmapCount = papers.filter((p) => p.workspaceId).length;

  return (
    <OpenProfile activeHref="/open">
      <section className="rounded-lg border border-border bg-surface-raised p-s-5">
        <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Catalog at a glance
        </p>
        <dl className="mt-s-3 grid grid-cols-3 gap-s-4">
          {[
            { label: "Papers", value: papers.length },
            { label: "Open access", value: openCount },
            { label: "With a mindmap", value: mindmapCount },
          ].map((s) => (
            <div key={s.label}>
              <dt className="font-sans text-xs text-ink-muted">{s.label}</dt>
              <dd className="font-mono text-2xl text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-s-6 rounded-lg border border-border bg-surface-raised p-s-5">
        <ContributionCalendar counts={counts} noun="papers" />
      </div>

      <section className="mt-s-6">
        <div className="flex items-baseline justify-between border-b border-border pb-s-2">
          <h2 className="font-sans text-base text-ink">Recently added</h2>
          <Link
            href="/open/papers"
            className="font-sans text-sm text-accent-text transition-colors duration-fast ease-out hover:underline"
          >
            View all {papers.length}
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recent.map((paper) => (
            <PaperRow key={paper.id} paper={paper} />
          ))}
        </ul>
      </section>
    </OpenProfile>
  );
}
