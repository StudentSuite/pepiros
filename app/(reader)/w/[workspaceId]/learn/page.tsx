import { FlashcardDeck } from "@/components/learn/FlashcardDeck";
import { QuizRunner } from "@/components/learn/QuizRunner";
import { ReaderTabsNav } from "@/components/reader/ReaderTabsNav";
import { getSession } from "@/lib/auth/session";
import { GuestBanner } from "@/components/auth/GuestBanner";
import { fetchWorkspace } from "@/lib/services/workspace";

/**
 * Static flashcards + quiz over the workspace's leaf nodes. No SM-2 /
 * adaptive difficulty (cut per plan.md §11) -- both components self-load
 * from useWorkspaceStore(), so this page is just layout + navigation.
 *
 * Guests can read: middleware.ts deliberately leaves /w open, same as the
 * main reader page.tsx -- this page used to render no banner at all and
 * didn't even import GuestBanner (issue #90).
 */
export default async function LearnPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();
  // Issue #147: no workspace/paper identity anywhere on this page -- a user
  // with two workspaces open in different tabs had no way to tell them apart.
  const workspace = await fetchWorkspace(workspaceId);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      {!session && <GuestBanner next={`/w/${workspaceId}/learn`} />}

      <main id="main-content" className="mx-auto max-w-6xl p-s-5">
        <header className="mb-s-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-sans font-bold text-2xl text-ink">Learn</h1>
            <p className="mt-1 font-sans text-xs text-ink-faint">{workspace.name}</p>
          </div>
          <ReaderTabsNav workspaceId={workspaceId} active="learn" />
        </header>

        <div className="flex max-w-3xl flex-col gap-s-6">
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-2xs uppercase tracking-widest text-ink-faint">Flashcards</h2>
            <FlashcardDeck />
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-s-6">
            <h2 className="font-mono text-2xs uppercase tracking-widest text-ink-faint">Quiz</h2>
            <QuizRunner workspaceId={workspaceId} />
          </section>
        </div>
      </main>
    </div>
  );
}
