"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { RefChip } from "@/components/ui/RefChip";
import { useWorkspaceStore } from "@/lib/store/workspace";

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  citationRefId: string;
}

type Stage = "question" | "answered" | "explaining" | "summary";

/**
 * Questions are generated from whichever workspace is actually loaded
 * (lib/services/quiz.ts, over leaves whose evidence already cleared
 * quote_located), not hardcoded to the fixture's authors and citation ids.
 * Fixed order, fixed set once loaded: no adaptive difficulty (cut per
 * plan.md §11).
 */
export function QuizRunner({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("question");
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // /learn is reachable directly, not only via the reader, so the store
  // can't be assumed already populated the way it is when ReaderClient's
  // own effect has already run.
  useEffect(() => {
    if (!workspace || workspace.id !== workspaceId) void loadWorkspace(workspaceId);
  }, [workspace, workspaceId, loadWorkspace]);

  useEffect(() => {
    if (!workspace || workspace.id !== workspaceId) return;
    let cancelled = false;

    setQuestions(null);
    setError(null);

    fetch(`/api/quiz?workspaceId=${encodeURIComponent(workspace.id)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
          setError(
            body?.error === "model_not_configured"
              ? "Quiz generation is unavailable on this deployment."
              : (body?.detail ?? `Quiz generation failed (${res.status}).`),
          );
          return;
        }
        const data = (await res.json()) as { questions: QuizQuestion[] };
        setQuestions(data.questions);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Quiz generation failed.");
      });

    return () => {
      cancelled = true;
    };
  }, [workspace, workspaceId]);

  if (error) {
    return <p className="font-sans text-xs text-unsupported">{error}</p>;
  }

  if (!questions) {
    return <p className="font-sans text-xs text-ink-faint">Generating quiz questions from this workspace…</p>;
  }

  if (questions.length === 0) {
    return (
      <p className="font-sans text-xs text-ink-faint">
        Nothing to quiz yet -- no leaf node here has a located quote to test.
      </p>
    );
  }

  const question = questions[index];

  if (stage === "summary" || !question) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="font-serif text-lg text-ink">
          {correctCount} / {questions.length} correct
        </p>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setStage("question");
            setSelected(null);
            setCorrectCount(0);
          }}
          className="rounded border border-border-strong px-3 py-1.5 font-sans text-sm text-ink-muted hover:text-ink"
        >
          Restart
        </button>
      </div>
    );
  }

  function selectOption(i: number) {
    if (stage !== "question") return;
    setSelected(i);
    setStage("answered");
    if (i === question!.correctIndex) setCorrectCount((c) => c + 1);
  }

  function goNext() {
    if (index + 1 >= questions!.length) {
      setStage("summary");
    } else {
      setIndex((i) => i + 1);
      setStage("question");
      setSelected(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-xs text-ink-faint">
        Question {index + 1} of {questions.length}
      </p>
      <p className="font-serif text-base text-ink">{question.prompt}</p>

      <ul className="flex flex-col gap-2">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === question.correctIndex;
          const revealed = stage !== "question";
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectOption(i)}
                disabled={stage !== "question"}
                className={clsx(
                  "w-full rounded border px-3 py-2 text-left font-sans text-sm transition-colors",
                  !revealed && "border-border text-ink hover:border-border-strong",
                  revealed && isCorrect && "border-located/70 bg-located/10 text-ink",
                  revealed && isSelected && !isCorrect && "border-unsupported/70 bg-unsupported/10 text-ink",
                  revealed && !isSelected && !isCorrect && "border-border text-ink-faint",
                )}
              >
                {opt}
                {revealed && isCorrect && <span className="sr-only"> -- correct answer</span>}
                {revealed && isSelected && !isCorrect && <span className="sr-only"> -- your answer, incorrect</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {stage === "answered" && (
        <button
          type="button"
          onClick={() => setStage("explaining")}
          className="self-start rounded border border-border-strong px-3 py-1.5 font-sans text-xs text-ink-muted hover:text-ink"
        >
          Show explanation
        </button>
      )}

      {stage === "explaining" && (
        <div className="rounded border border-border bg-surface-raised p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <RefChip refId={question.citationRefId} />
            <span className="font-sans text-xs text-ink-faint">explanation</span>
          </div>
          <p className="font-sans text-sm text-ink-muted">{question.explanation}</p>
          <button
            type="button"
            onClick={goNext}
            className="mt-3 rounded bg-pillar-4/20 px-3 py-1.5 font-sans text-xs text-ink hover:bg-pillar-4/30"
          >
            {index + 1 >= questions.length ? "See summary" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}
