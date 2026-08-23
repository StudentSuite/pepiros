import type { Metadata } from "next";
import { CATALOG, paperAddedAt } from "@/lib/data/papers";
import { withIndexedWorkspaces } from "@/lib/services/catalogWorkspaces";
import { PaperRow } from "@/components/profile/PaperRow";
import { OpenProfile } from "../OpenProfile";

export const metadata: Metadata = {
  title: "Papers / Open",
  description: "Every paper in the public Pepiros catalog.",
};

/** /open Papers: the full catalog, newest addition first. */
export default async function OpenPapersTab() {
  const papers = await withIndexedWorkspaces(CATALOG);
  const sorted = [...papers].sort((a, b) =>
    paperAddedAt(b).localeCompare(paperAddedAt(a))
  );

  return (
    <OpenProfile activeHref="/open/papers">
      <h2 className="border-b border-border pb-s-2 font-sans text-base text-ink">
        {sorted.length} papers
      </h2>
      <ul className="divide-y divide-border">
        {sorted.map((paper) => (
          <PaperRow key={paper.id} paper={paper} />
        ))}
      </ul>
    </OpenProfile>
  );
}
