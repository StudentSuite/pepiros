"use client";

import { useState } from "react";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { DispersionGlow } from "@/components/site/DispersionGlow";

function stripMarkers(text: string): string {
  return text.replace(/\[\^[a-zA-Z0-9_-]+\]/g, "").trim();
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

/**
 * The fixture has no `flashcards` table rows, so cards are synthesized from
 * leaf-node title/bodyMd pairs at render time -- front is the node title,
 * back is the body with citation markers stripped (a flashcard isn't the
 * place to show a RefChip, there's no source pane beside it here).
 */
function synthesizeFlashcards(
  nodes: { id: string; type: string; title: string; bodyMd: string }[],
): Flashcard[] {
  return nodes
    .filter((n) => n.type === "leaf")
    .map((n) => ({ id: n.id, front: n.title, back: stripMarkers(n.bodyMd) }));
}

/**
 * Static flip-card UI. No SM-2 / adaptive scheduling (cut per plan.md §11) --
 * rating buttons just advance to the next card in a fixed order, they don't
 * reorder or resurface anything.
 */
export function FlashcardDeck() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!workspace) {
    return <p className="font-sans text-xs text-ink-faint">Loading workspace...</p>;
  }

  const cards = synthesizeFlashcards(workspace.nodes);
  if (cards.length === 0) {
    return <p className="font-sans text-xs text-ink-faint">No flashcards available.</p>;
  }

  const card = cards[index % cards.length]!;

  function next() {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-sans text-xs text-ink-faint">
        {(index % cards.length) + 1} of {cards.length}
      </p>

      <div className="relative w-full max-w-md">
        {/* Issue #308: "a dispersion back face" -- a soft halo behind the
            card, only on its answer side, never a fill inside it (the
            SURFACE RULE still applies: this card carries body text to
            read, so the card itself stays opaque). */}
        {flipped && (
          <DispersionGlow
            tone="green"
            className="left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2"
            opacity={0.18}
          />
        )}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          aria-pressed={flipped}
          aria-label={flipped ? "Card back, press to flip to front" : "Card front, press to flip to back"}
          className={clsx(
            "surface-reading paper-grain relative flex min-h-[160px] w-full items-center justify-center rounded-lg p-6 text-center shadow-lg",
          )}
        >
          <p
            aria-live="polite"
            className={clsx("font-serif text-base leading-snug text-ink", flipped && "italic")}
          >
            {flipped ? card.back : card.front}
          </p>
        </button>
      </div>

      <p className="font-sans text-[11px] text-ink-faint">
        Click the card (or press space) to flip.
      </p>

      <div className="flex gap-2">
        {(["Again", "Hard", "Good", "Easy"] as const).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={next}
            className="rounded-lg border border-border-strong px-3 py-1 font-sans text-xs text-ink-muted hover:border-ink-muted hover:text-ink"
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}
