"use client";

import { useState } from "react";
import clsx from "clsx";
import type { ChatMessage } from "./MessageList";

/**
 * "Promote this answer into a new graph node" -- the plan.md §7 MCP demo
 * beat (create_node re-verifies server-side and the canvas opens with the
 * new node highlighted). No create_node call exists yet, so this stubs the
 * handler: optimistic local "promoted" state + a console.log of what would
 * be sent.
 */
export function PromoteButton({ message }: { message: ChatMessage }) {
  const [promoted, setPromoted] = useState(false);

  return (
    <button
      type="button"
      disabled={promoted}
      onClick={() => {
        // eslint-disable-next-line no-console
        console.log("promote (stub, no create_node MCP call yet):", message);
        setPromoted(true);
      }}
      className={clsx(
        "rounded border px-2 py-1 font-sans text-[11px] transition-colors",
        promoted
          ? "border-located/60 text-located"
          : "border-border-strong text-ink-muted hover:border-ink-muted hover:text-ink",
      )}
    >
      {promoted ? "Promoted to graph" : "Promote to node"}
    </button>
  );
}
