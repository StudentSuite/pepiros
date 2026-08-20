import clsx from "clsx";
import type { EvidenceTier } from "@/types/anchor";
import { CitationChip } from "./CitationChip";
import { PromoteButton } from "./PromoteButton";

export type ChatSegment = { kind: "text"; text: string } | { kind: "citation"; refId: string };

export interface ChatMessageCitation {
  refId: string;
  tier: EvidenceTier;
  quote: string | null;
  matchScore: number;
  page: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  segments: ChatSegment[];
  /** Answer carried no supported citation. Rendered distinctly per §9.4 --
   *  ungrounded output must never be visually interchangeable with grounded. */
  ungrounded?: boolean;
  /** Re-verified citations behind this answer, carried for Promote to node
   *  (create_node needs the actual quote, not just the ref id). */
  citations?: ChatMessageCitation[];
  /** The question this answer responds to, used as the promoted node's title. */
  question?: string;
}

/** Renders the message array, user vs. assistant styling. */
export function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const ungrounded = !isUser && message.ungrounded;
        // Issue #210: this used to be looked up per-chip from the global
        // workspace.evidence array (keyed by node, and ambiguous -- the same
        // refId string can legitimately appear on multiple nodes with
        // different tiers). This message's own citations array is the
        // actually re-verified evidence for *this* answer.
        const citationsByRefId = new Map(message.citations?.map((c) => [c.refId, c]));
        return (
          <li key={message.id} className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded px-3 py-2 font-sans text-sm leading-relaxed",
                isUser
                  ? "bg-surface-sunken text-ink"
                  : "border border-border bg-surface-raised text-ink",
                // Amber left border (§9.4), so "no source backs this" is
                // legible at a glance rather than only on close reading.
                ungrounded && "border-l-2 border-l-paraphrase",
              )}
            >
              {ungrounded && (
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-paraphrase">
                  No sources located
                </div>
              )}
              {/* A div, not a <p> -- CitationChip can render a SourcePopover
                  with block-level markup, which isn't valid inside a <p>. */}
              <div>
                {message.segments.map((seg, i) =>
                  seg.kind === "text" ? (
                    <span key={i}>{seg.text}</span>
                  ) : (
                    <CitationChip key={i} refId={seg.refId} citation={citationsByRefId.get(seg.refId)} />
                  ),
                )}
              </div>
              {!isUser && (
                <div className="mt-2">
                  <PromoteButton message={message} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
