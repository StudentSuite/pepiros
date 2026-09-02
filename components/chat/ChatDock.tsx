"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { EvidenceTier } from "@/types/anchor";
import { MessageList, type ChatMessage } from "./MessageList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
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
export function ChatDock({
  activePaperId,
  pendingQuestion,
  onPendingQuestionHandled,
}: {
  activePaperId?: string;
  /**
   * Issue #294: "Ask opens the chat dock scoped to the selection." Set by a
   * source-pane selection's floating action; on the next render this fills
   * the draft and expands the dock, then calls onPendingQuestionHandled so
   * the parent clears it and a later identical selection can retrigger it.
   */
  pendingQuestion?: string | null;
  onPendingQuestionHandled?: () => void;
}) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  // Issue #321: issue #290's fix for a near-invisible collapsed state
  // overcorrected into the opposite problem -- a docked bar (scope
  // selector, input, suggestion chips) that rendered permanently, covering
  // real reading/inspector surface on both desktop and mobile with no true
  // dismiss. `open` now means exactly one thing: whether the whole panel is
  // showing at all. Closed renders nothing but a small FAB; there is no
  // third "resting, partially visible" state anymore.
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

  useEffect(() => {
    if (!pendingQuestion) return;
    setDraft(pendingQuestion);
    setOpen(true);
    onPendingQuestionHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion]);

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
    // Asking from a suggestion chip or a pending question (issue #294) can
    // only happen once the panel is already open (the closed state renders
    // no chips at all), but this stays harmless and keeps the panel open
    // through a send either way.
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

  // Issue #321: the collapsed rest state is a small FAB, full stop -- not a
  // docked bar with the scope selector/input/suggestions still showing.
  // This is the only thing rendered on both desktop and mobile until a
  // reader explicitly asks for the panel.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask a question about this workspace"
        className="glass fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-e-2 transition-colors duration-fast ease-out hover:text-accent-text"
      >
        <Icon icon={MessageCircle} size="md" />
      </button>
    );
  }

  return (
    // Full-width bottom sheet below sm (mobile: "explicit bottom-sheet
    // triggered by tap", never resting open), an anchored corner panel at
    // sm+ (desktop) -- either way it opens on demand and closes via the X
    // below, rather than sitting over the reading/inspector surface by
    // default the way the old always-rendered bar did.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:inset-x-auto sm:right-4 sm:justify-end sm:px-0">
      <div className="glass pointer-events-auto flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg sm:max-h-[min(32rem,80vh)] sm:w-96">
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
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="text-ink-faint hover:text-ink"
          >
            <Icon icon={X} size="sm" />
          </button>
        </div>

        {/* Issue #211: new replies were never announced to screen reader
           users -- the only role="status" was the transient "Reading
           the papers..." line, gone the instant the real answer lands.
           role="log" + aria-live="polite" here announces each new
           message as it's appended. */}
        <div ref={scrollRef} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
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
