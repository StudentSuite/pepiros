import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdapter } from "@/lib/data/adapter";
import { fetchWorkspace } from "@/lib/services/workspace";
import { buildMindmapOutline } from "@/lib/mindmap/exportOutline";
import { ArticleHeader } from "@/components/reading/Article";
import { MindmapView } from "@/components/mindmap/MindmapView";
import { buttonClassName } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getAdapter().getCatalogPaper(slug);
  if (!paper) notFound();
  return { title: `${paper.title} -- Mindmap` };
}

/**
 * A rendering layer over a paper's already-verified pillar/claim graph
 * (issue #312, mechanism locked in context-for-pep.md §8): the markdown
 * outline comes from lib/mindmap/exportOutline.ts, nothing here calls a
 * model. No shader Band -- same reasoning as the reader and canvas
 * (issues #306/#307): this is a dense working visualization, not a bookend
 * moment.
 */
export default async function PaperMindmapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paper = await getAdapter().getCatalogPaper(slug);
  if (!paper) notFound();

  const workspace = paper.workspaceId ? await fetchWorkspace(paper.workspaceId) : null;
  // The catalog's own paper id (lib/data/papers.ts, e.g. "p-nkx25-mutation")
  // is never the same string as the id a real-ingested workspace's graph
  // carries (e.g. "paper-a0383c28") -- same mismatch OutlineClient.tsx's own
  // comment warns about for the fixture's "n-p1"/"p1" split, just a
  // different pair of schemes. A catalog paper's own dedicated workspace
  // only ever holds that one paper (unlike a generic multi-paper /w/
  // reader workspace), so its real graph id is always workspace.papers[0].
  const realPaperId = workspace?.papers[0]?.id ?? null;
  const outline = workspace && realPaperId ? buildMindmapOutline(workspace, realPaperId) : null;

  return (
    // This route sits under the (platform) group, whose own layout already
    // supplies <main id="main-content"> -- matching app/(platform)/paper/
    // [slug]/page.tsx's own plain <main> here rather than nesting a second
    // id="main-content" landmark inside it.
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[64rem] flex-col px-s-5 pb-s-8">
      <ArticleHeader kicker="Mindmap" title={paper.title} />

      {outline?.markdown ? (
        <div className="mt-s-5 flex-1 rounded-lg border border-border bg-surface-raised">
          <MindmapView markdown={outline.markdown} pillarOrder={outline.pillarOrder} />
        </div>
      ) : (
        // Same honest-empty-state pattern as /paper/[slug] itself: a paper
        // with no workspace (or one whose graph has no pillars yet) shows
        // that plainly rather than an empty canvas pretending to be a map.
        <p className="mt-s-5 rounded-md border border-dashed border-border px-s-4 py-s-3 font-sans text-[13px] leading-relaxed text-ink-faint">
          This paper isn&rsquo;t indexed for a mindmap yet -- it needs a real claim graph first,
          which the weekly catalog indexer builds automatically.
        </p>
      )}

      <Link href={`/paper/${slug}`} className={buttonClassName("secondary", "sm", "mt-s-5 self-start")}>
        Back to paper
      </Link>
    </main>
  );
}
