"use client";

import { useState } from "react";
import { MessageList, type ChatMessage } from "./MessageList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useWorkspaceStore } from "@/lib/store/workspace";
import { toCitationSegments } from "@/lib/chat/citations";

// docs/PLAN-V1.md §14.5: "4 suggested questions from the paper's real
// concepts," never generic. Fixture-scoped since there's no live paper
// analysis to derive these from yet -- swap for a real derivation once
// that pipeline exists, not for a generic placeholder set.
const SUGGESTED_QUESTIONS = [
  "What did the bright-light RCT actually find?",
  "Does the meta-analysis hold up under its own limitations?",
  "Where do the two papers disagree?",
  "What does neither paper establish?",
];

type Scope = "all" | "paper" | "node";

interface ChatApiResponse {
  answer: string;
  citations: Array<{ refId: string; tier: string }>;
  ungrounded: boolean;
  refused: boolean;
}

/**
 * Bottom-docked chat, wired to POST /api/chat (docs/PLAN-V1.md §9.4). The
 * answer's citations are verified server-side before they get here, so an
 * ungrounded answer is marked as such rather than rendered as if it were
 * sourced -- §9.4 requires ungrounded output be visually distinct.
 */
export function ChatDock() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowUngrounded, setAllowUngrounded] = useState(false);
  const [lastRefusedQuestion, setLastRefusedQuestion] = useState<string | null>(null);

  async function ask(question: string, options: { allowUngrounded?: boolean } = {}) {
    setPending(true);
    setError(null);

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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id ?? "ws-1",
          question,
          history,
          scope,
          paperId: scope !== "all" ? workspace?.papers[0]?.id : undefined,
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
              {messages.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="font-sans text-xs text-ink-faint">Try asking:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
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
                  <ErrorBanner message={error} onRetry={() => setError(null)} />
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
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask about this workspace..."
                disabled={pending}
                className="flex-1"
              />
              <Button variant="primary" size="sm" onClick={handleSend} disabled={pending}>
                {pending ? "Asking…" : "Send"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
