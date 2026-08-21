"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EvidenceTier } from "@/types/anchor";
import { MessageList, type ChatMessage } from "./MessageList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { toCitationSegments } from "@/lib/chat/citations";
import { deriveSuggestedQuestions } from "@/lib/chat/suggestions";

type Scope = "all" | "paper" | "node";

interface ChatApiResponse {
  answer: string;
  citations: Array<{ refId: string; tier: EvidenceTier; quote: string | null; matchScore: number; page: number | null }>;
  ungrounded: boolean;
  refused: boolean;
}

/**
 * Bottom-docked chat, wired to POST /api/chat (docs/PLAN-V1.md §9.4). The
 * answer's citations are verified server-side before they get here, so an
 * ungrounded answer is marked as such rather than rendered as if it were
 * sourced -- §9.4 requires ungrounded output be visually distinct.
 */
export function ChatDock({ activePaperId }: { activePaperId?: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  // Issue #290: this used to gate ALL of scope/input/suggestions behind
  // `open`, so the collapsed default rendered as a 40px strip with nothing
  // in it but a scope selector and an "Expand" link -- suggested questions
  // (lib/chat/suggestions.ts, a real per-paper derivation) were invisible
  // until a visitor found and clicked Expand first. `open` now gates only
  // the scrollable message history; the resting (collapsed) state still
  // renders the scope selector, the input, and two suggestion chips, so
  // grounded Q&A is reachable without that extra click. Sending the first
  // message expands to full height automatically (see ask()).
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Issue #212: nothing scrolled this container as messages grew, so a new
  // answer could land below the visible fold of this small fixed-height dock
  // with no visual cue it had arrived.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  const [draft, setDraft] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  // Issue #166: "This node" used to silently fall back to paper-scope (or
  // even the workspace's first paper) whenever no node was selected, with
  // no indication the user's explicit scope choice wasn't honored. If the
  // selection clears while "node" scope is active (e.g. the inspector
  // closes), drop back to "all" rather than keep a scope that's quietly
  // behaving like something broader.
  useEffect(() => {
    if (scope === "node" && !selectedNodeId) setScope("all");
  }, [scope, selectedNodeId]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowUngrounded, setAllowUngrounded] = useState(false);
  const [lastRefusedQuestion, setLastRefusedQuestion] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const suggestedQuestions = useMemo(() => deriveSuggestedQuestions(workspace), [workspace]);

  async function ask(question: string, options: { allowUngrounded?: boolean } = {}) {
    // Issue #290: expand to full height on the first send, so the message
    // history (and the room a real answer needs) appears the moment
    // there's something to show, rather than requiring a separate click.
    setOpen(true);
    setPending(true);
    setError(null);
    setLastQuestion(question);

    // History is the prior turns only -- the question being asked is passed
    // separately, since the server rewrites it against this history.
    const history = messages.map((m) => ({
      role: m.role,
      content: m.segments.map((s) => (s.kind === "text" ? s.text : `[${s.refId}]`)).join(""),
    }));

    setMessages((prev) => [
      ...prev,
      { id: `u${prev.length}`, role: "user", segments: [{ kind: "text", text: question }] },
    ]);

    // "node" scope means the currently *selected* node's paper, not just
    // "whichever paper the reader happens to be looking at" -- selecting a
    // node from a different paper than the active one and asking a "this
    // node" question used to silently answer over the wrong paper's context.
    // "paper" scope uses activePaperId (ReaderClient's own state, passed in
    // as a prop), falling back to the workspace's first paper only if it
    // wasn't given -- both used to hardcode the first paper regardless.
    const selectedNodePaperId =
      scope === "node" ? workspace?.nodes.find((n) => n.id === selectedNodeId)?.paperId : undefined;
    const scopedPaperId = selectedNodePaperId ?? activePaperId ?? workspace?.papers[0]?.id;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id ?? "ws-1",
          question,
          history,
          scope,
          paperId: scope !== "all" ? scopedPaperId : undefined,
          allowUngrounded: options.allowUngrounded ?? allowUngrounded,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        setError(
          body?.error === "model_not_configured"
            ? "Chat is unavailable on this deployment. Everything else, including verification, still works."
            : (body?.detail ?? `Chat failed (${res.status}).`),
        );
        return;
      }

      const data = (await res.json()) as ChatApiResponse;
      setLastRefusedQuestion(data.refused ? question : null);
      setMessages((prev) => [
        ...prev,
        {
          id: `a${prev.length}`,
          role: "assistant",
          segments: toCitationSegments(data.answer),
          ungrounded: data.ungrounded,
          citations: data.citations,
          question,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat request failed.");
    } finally {
      setPending(false);
    }
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    void ask(text);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className="glass pointer-events-auto w-full max-w-2xl rounded-lg">
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
              <option value="node" disabled={!selectedNodeId}>
                {selectedNodeId ? "This node" : "This node (select one first)"}
              </option>
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
          /* Issue #211: new replies were never announced to screen reader
             users -- the only role="status" was the transient "Reading
             the papers..." line, gone the instant the real answer lands.
             role="log" + aria-live="polite" here announces each new
             message as it's appended. */
          <div ref={scrollRef} role="log" aria-live="polite" className="max-h-72 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-sans text-xs text-ink-faint">Try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void ask(q)}
                      disabled={pending}
                      className="rounded-full border border-border-strong px-2.5 py-1 text-left font-sans text-xs text-ink-muted transition duration-fast ease-out hover:border-accent hover:text-ink disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <MessageList messages={messages} />
            )}

            {pending && (
              <p className="mt-3 font-sans text-xs text-ink-faint" role="status">
                Reading the papers…
              </p>
            )}

            {error && (
              <div className="mt-3">
                <ErrorBanner
                  message={error}
                  onRetry={lastQuestion ? () => void ask(lastQuestion) : undefined}
                />
              </div>
            )}

            {/* §9.4: below the relevance floor, offer an explicit
                "answer without sources" rather than silently confabulating. */}
            {lastRefusedQuestion && !pending && (
              <button
                type="button"
                onClick={() => {
                  const question = lastRefusedQuestion;
                  setLastRefusedQuestion(null);
                  setAllowUngrounded(true);
                  void ask(question, { allowUngrounded: true });
                }}
                className="mt-3 rounded border border-border-strong px-2 py-1 font-sans text-xs text-ink-muted hover:text-ink"
              >
                Answer without sources
              </button>
            )}
          </div>
        )}

        {/* Issue #290: the resting state (collapsed, nothing asked yet) --
            two of the same real per-paper suggestions the expanded empty
            state shows, so grounded Q&A is visible without an extra click.
            Once there's a real conversation, showing the original "try
            asking" prompts again here would be stale, so this only shows
            before the first message. */}
        {!open && messages.length === 0 && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2">
            {suggestedQuestions.slice(0, 2).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void ask(q)}
                disabled={pending}
                className="rounded-full border border-border-strong px-2.5 py-1 text-left font-sans text-xs text-ink-muted transition duration-fast ease-out hover:border-accent hover:text-ink disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Issue #213: without the isComposing guard, the Enter
              // keystroke a CJK/IME user presses to confirm a composed
              // candidate also fired this handler, sending the message
              // mid-composition.
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
            }}
            placeholder="Ask about this workspace..."
            disabled={pending}
            className="flex-1"
          />
          <Button variant="primary" size="sm" onClick={handleSend} disabled={pending}>
            {pending ? "Asking…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
