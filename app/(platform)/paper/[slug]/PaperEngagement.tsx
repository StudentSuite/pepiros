"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLikeAction } from "../../actions";

interface PaperEngagementProps {
  initialScore: number;
  /** Present only when this paper corresponds to a real published post. */
  real?: { postId: string; slug: string; initiallyLiked: boolean };
}

/**
 * Like control for a paper. `real` present means this paper has an actual
 * `posts` row (docs' publish/follow/comments work): the click calls
 * toggleLikeAction and writes to the live `likes` table. Without it (seed
 * mode, or a catalog paper nobody has published), this stays exactly the
 * prior local-only optimistic toggle -- there is nothing real to write to,
 * so it says nothing that implies otherwise.
 */
export function PaperEngagement({ initialScore, real }: PaperEngagementProps) {
  const [liked, setLiked] = useState(real?.initiallyLiked ?? false);
  const [count, setCount] = useState(initialScore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !liked;

    if (!real) {
      setLiked(next);
      return;
    }

    setError(null);
    setPending(true);
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      await toggleLikeAction({ postId: real.postId, slug: real.slug, liked: next });
    } catch (err) {
      // Roll back: the write didn't happen, so the UI shouldn't claim it did.
      setLiked(!next);
      setCount((c) => c - (next ? 1 : -1));
      setError(err instanceof Error ? err.message : "Could not update your like.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? "Remove like" : "Like this paper"}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-s-3 py-1.5",
          "font-mono text-[11px] tabular-nums transition-colors duration-fast ease-out disabled:opacity-60",
          liked
            ? "border-pillar-5/50 bg-pillar-5/10 text-pillar-text-5"
            : "border-border text-ink-faint hover:border-border-strong hover:text-ink",
        )}
      >
        <Heart className={cn("size-3.5", liked && "fill-current")} strokeWidth={1.5} />
        {count.toLocaleString()}
      </button>
      {error && <span className="font-sans text-[11px] text-unsupported">{error}</span>}
    </div>
  );
}
