"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Like control for a paper.
 *
 * Optimistic and local: there is no likes endpoint yet, so it changes only what
 * the reader can see. Deliberately not wired to a fake success toast, which
 * would imply a write that did not happen.
 */
export function PaperEngagement({ initialScore }: { initialScore: number }) {
  const [liked, setLiked] = useState(false);
  const count = initialScore + (liked ? 1 : 0);

  return (
    <button
      type="button"
      onClick={() => setLiked((v) => !v)}
      aria-pressed={liked}
      aria-label={liked ? "Remove like" : "Like this paper"}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-s-3 py-1.5",
        "font-mono text-[11px] tabular-nums transition-colors duration-fast ease-out",
        liked
          ? "border-pillar-5/50 bg-pillar-5/10 text-pillar-text-5"
          : "border-border text-ink-faint hover:border-border-strong hover:text-ink",
      )}
    >
      <Heart className={cn("size-3.5", liked && "fill-current")} strokeWidth={1.5} />
      {count.toLocaleString()}
    </button>
  );
}
