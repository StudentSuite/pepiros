"use client";

import { useState } from "react";
import clsx from "clsx";
import { MessageList, type ChatMessage } from "./MessageList";

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    segments: [
      {
        kind: "text",
        text: "What did the bright-light RCT find, and does anything in the meta-analysis not hold up?",
      },
    ],
  },
  {
    id: "m2",
    role: "assistant",
    segments: [
      { kind: "text", text: "The bright-light RCT found sleep onset latency fell 34% vs. placebo " },
      { kind: "citation", refId: "C2" },
      { kind: "text", text: ". Separately, the meta-analysis reports a moderate pooled effect on working memory " },
      { kind: "citation", refId: "C5" },
      {
        kind: "text",
        text: ", though one claimed limitation about the pooled estimate being precise didn't hold up on re-verification ",
      },
      { kind: "citation", refId: "C7" },
      { kind: "text", text: " -- that evidence came back unsupported, not quote located." },
    ],
  },
];

type Scope = "all" | "paper" | "node";

/**
 * Bottom-docked chat shell. This is a UI-only stub: messages are seeded
 * locally, "sending" just appends a user message (no LLM call -- wiring to
 * app/api/chat is someone else's job and that route doesn't exist yet).
 */
export function ChatDock() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `m${prev.length + 1}`, role: "user", segments: [{ kind: "text", text }] },
    ]);
    setDraft("");
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className="pointer-events-auto w-full max-w-2xl rounded border border-border bg-surface-raised shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm font-medium text-ink">Ask</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              aria-label="Chat scope"
              className="rounded border border-border bg-surface-sunken px-1.5 py-0.5 font-sans text-xs text-ink-muted"
            >
              <option value="all">All papers</option>
              <option value="paper">This paper</option>
              <option value="node">This node</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="font-sans text-xs text-ink-faint hover:text-ink"
          >
            {open ? "Collapse" : "Expand"}
          </button>
        </div>

        {open && (
          <>
            <div className="max-h-72 overflow-y-auto px-3 py-3">
              <MessageList messages={messages} />
            </div>
            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask about this workspace..."
                className={clsx(
                  "flex-1 rounded border border-border bg-surface-sunken px-2 py-1.5",
                  "font-sans text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-border-strong",
                )}
              />
              <button
                type="button"
                onClick={handleSend}
                className="rounded bg-pillar-4/20 px-3 py-1.5 font-sans text-sm text-ink hover:bg-pillar-4/30"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
