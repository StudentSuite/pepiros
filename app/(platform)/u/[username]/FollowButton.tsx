"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toggleFollowAction } from "../../actions";

interface FollowButtonProps {
  /** Present only when the viewed profile is a real account (getFollowState resolved it). */
  real?: { followeeId: string; username: string; initiallyFollowing: boolean };
}

/**
 * Follow toggle. `real` present means this is an actual profile (docs'
 * publish/follow/comments work): the click calls toggleFollowAction and
 * writes to the live `follows` table. Without it (a catalog author persona
 * with no real account behind it, or seed mode), this stays the prior
 * local-only toggle -- there is no real account to follow.
 */
export function FollowButton({ real }: FollowButtonProps) {
  const [following, setFollowing] = useState(real?.initiallyFollowing ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !following;

    if (!real) {
      setFollowing(next);
      return;
    }

    setError(null);
    setPending(true);
    setFollowing(next);
    try {
      await toggleFollowAction({ followeeId: real.followeeId, username: real.username, following: next });
    } catch (err) {
      setFollowing(!next);
      setError(err instanceof Error ? err.message : "Could not update follow.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant={following ? "secondary" : "primary"}
        size="sm"
        onClick={() => void toggle()}
        disabled={pending}
        aria-pressed={following}
        className="min-w-[7rem]"
      >
        {following ? "Following" : "Follow"}
      </Button>
      {error && <span className="font-sans text-[11px] text-unsupported">{error}</span>}
    </div>
  );
}
