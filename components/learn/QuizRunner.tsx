"use client";

import { useState } from "react";
import clsx from "clsx";
import { RefChip } from "@/components/ui/RefChip";

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  citationRefId: string;
}

/**
 * The fixture has no `quizzes` table rows, so this is a small hand-authored
 * set grounded in the fixture's actual claims (each explanation cites the
 * real refId behind it -- "explanations always cited", never a bare
 * assertion). Fixed order, fixed set: no adaptive difficulty (cut per
 * plan.md §11).
 */
const QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt:
      "In the bright-light RCT (Okafor & Lindqvist, 2022), how did sleep onset latency change in the treatment arm vs. placebo?",
    options: ["Decreased 34% (95% CI 21-45)", "Decreased 12%", "Increased 34%", "No significant change"],
    correctIndex: 0,
    explanation: "The located quote in the Results section reports exactly this figure, p=0.003.",
    citationRefId: "C2",
  },
  {
    id: "q2",
    prompt: "What pooled effect size did Chen et al.'s meta-analysis find on working memory?",
    options: ["d=0.85", "r=0.41", "d=0.41 (95% CI 0.29-0.53)", "No effect found"],
    correctIndex: 2,
    explanation: "Pooled across 18 studies (n=4,213); the quote is located verbatim in the Results section.",
    citationRefId: "C5",
  },
  {
    id: "q3",
    prompt: "In Boateng (2023), how did under-5-hour sleepers' Trail Making Test scores compare to the well-rested subgroup?",
    options: ["Significant decline (p<0.01)", "Improved performance", "No significant decline (p=0.41)", "Test wasn't administered to that group"],
    correctIndex: 2,
    explanation: "A null result -- this is the leg of the cross-paper contradiction with the meta-analysis's pooled effect.",
    citationRefId: "C9",
  },
  {
    id: "q4",
    prompt: "What happened to the claim behind citation C7 (cohort-heterogeneity precision) on re-verification?",
    options: ["It stayed quote located", "It was downgraded to paraphrase", "It came back unsupported and the anchor was dropped", "It was never checked"],
    correctIndex: 2,
    explanation:
      "This is the workspace's one planted misattribution: the claimed quote didn't clear the paraphrase floor, so the anchor was dropped and the citation reads unsupported.",
    citationRefId: "C7",
  },
];

type Stage = "question" | "answered" | "explaining" | "summary";

export function QuizRunner() {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("question");
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const question = QUESTIONS[index];

  if (stage === "summary" || !question) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="font-serif text-lg text-ink">
          {correctCount} / {QUESTIONS.length} correct
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
    if (index + 1 >= QUESTIONS.length) {
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
        Question {index + 1} of {QUESTIONS.length}
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
            {index + 1 >= QUESTIONS.length ? "See summary" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}
