"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { ChatMessage } from "./MessageList";

/**
 * "Promote this answer into a new graph node" -- the plan.md §7 MCP demo
 * beat (create_node re-verifies server-side and the canvas opens with the
 * new node highlighted). No create_node call exists yet, so this stubs the
 * handler: optimistic local "promoted" state + a console.log of what would
 * be sent.
 *
 * docs/PLAN-V1.md §14.3 specs a 480ms ghost-card flight from this button to
 * the new node's canvas position. Not built here, on purpose: this chat dock
 * lives on the reader route, the canvas is a separate route
 * (/w/[id]/canvas) per plan.md §1 ("canvas is reached only via the explicit
 * Explore graph link"), and there's no create_node call yet to give the
 * flight a real destination -- MessageList's own comment already flags this
 * dock as a static UI shell. Faking cross-page motion toward a node that
 * doesn't exist would be worse than the honest, contained confirmation below.
 */
export function PromoteButton({ message }: { message: ChatMessage }) {
  const [promoted, setPromoted] = useState(false);

  return (
    <button
      type="button"
      disabled={promoted}
      onClick={() => {

        console.log("promote (stub, no create_node MCP call yet):", message);
        setPromoted(true);
      }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-sans text-[11px] transition duration-fast ease-out",
        promoted
          ? "border-located/60 text-located"
          : "border-border-strong text-ink-muted hover:border-ink-muted hover:text-ink",
      )}
    >
      {promoted && (
        <Icon icon={Check} size="xs" className="animate-[node-appear_var(--dur-base)_var(--ease-out)]" />
      )}
      {promoted ? "Promoted to graph" : "Promote to node"}
    </button>
  );
}
