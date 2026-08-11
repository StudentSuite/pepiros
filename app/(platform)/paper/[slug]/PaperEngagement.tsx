"use client";

import { useState } from "react";
import clsx from "clsx";
import { Heart, UserPlus, UserCheck } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Follow + like controls for `/paper/[slug]`. Colocated with page.tsx rather
 * than the page itself being "use client": notFound() is Server-Component-
 * only (Next's own JSDoc on the function -- Server Components, Route
 * Handlers, Server Actions, not Client Components), so the page stays a
 * Server Component and only this small interactive sliver is a client
 * boundary. State is local `useState` only, no persistence beyond the page
 * session (Task 6 brief).
 */
export function PaperEngagement({ initialLikeCount }: { initialLikeCount: number }) {
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const likeCount = initialLikeCount + (liked ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={following}
        onClick={() => {
          setFollowing((value) => !value);
        }}
        className={buttonClassName(following ? "secondary" : "primary", "sm")}
      >
        <Icon icon={following ? UserCheck : UserPlus} size="xs" className="mr-1.5" />
        {following ? "Following" : "Follow"}
      </button>
      <button
        type="button"
        aria-pressed={liked}
        onClick={() => {
          setLiked((value) => !value);
        }}
        className={clsx(buttonClassName("ghost", "sm"), liked && "text-accent")}
      >
        <Icon icon={Heart} size="xs" className={clsx("mr-1.5", liked && "fill-current")} />
        {likeCount}
      </button>
    </div>
  );
}
