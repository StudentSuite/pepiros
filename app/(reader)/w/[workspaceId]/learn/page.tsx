import Link from "next/link";
import { FlashcardDeck } from "@/components/learn/FlashcardDeck";
import { QuizRunner } from "@/components/learn/QuizRunner";

/**
 * Static flashcards + quiz over the workspace's leaf nodes. No SM-2 /
 * adaptive difficulty (cut per plan.md §11) -- both components self-load
 * from useWorkspaceStore(), so this page is just layout + navigation.
 */
export default async function LearnPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <div className="min-h-dvh bg-surface px-6 py-8 text-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl text-ink">Learn</h1>
          <Link
            href={`/w/${workspaceId}`}
            className="font-sans text-xs text-ink-muted hover:text-ink"
          >
            ← Back to reader
          </Link>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Flashcards</h2>
          <FlashcardDeck />
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-8">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Quiz</h2>
          <QuizRunner />
        </section>
      </div>
    </div>
  );
}
