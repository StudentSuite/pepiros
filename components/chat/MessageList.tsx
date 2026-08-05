import clsx from "clsx";
import { CitationChip } from "./CitationChip";
import { PromoteButton } from "./PromoteButton";

export type ChatSegment = { kind: "text"; text: string } | { kind: "citation"; refId: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  segments: ChatSegment[];
}

/** Renders the message array, user vs. assistant styling. No streaming here
 *  (this is a static UI shell, plan.md's real chat wiring is app/api/chat,
 *  out of scope this pass) -- just the resting-state render. */
export function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <li key={message.id} className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded px-3 py-2 font-sans text-sm leading-relaxed",
                isUser
                  ? "bg-surface-sunken text-ink"
                  : "border border-border bg-surface-raised text-ink",
              )}
            >
              {/* A div, not a <p> -- CitationChip can render a SourcePopover
                  with block-level markup, which isn't valid inside a <p>. */}
              <div>
                {message.segments.map((seg, i) =>
                  seg.kind === "text" ? (
                    <span key={i}>{seg.text}</span>
                  ) : (
                    <CitationChip key={i} refId={seg.refId} />
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
