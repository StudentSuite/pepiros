"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/button";

/**
 * Local-only follow toggle. There is no follows endpoint yet, so this changes
 * the reader's own view and nothing else, and deliberately shows no success
 * toast that would imply a write.
 */
export function FollowButton() {
  const [following, setFollowing] = useState(false);
  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      onClick={() => setFollowing((v) => !v)}
      aria-pressed={following}
      className="min-w-[7rem]"
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
