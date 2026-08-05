"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import type { RelatedPaper, RelatedPapersResult } from "@/lib/services/related";

type State =
  | { phase: "loading" }
  | { phase: "done"; result: RelatedPapersResult };

const STATUS_COPY: Record<Exclude<RelatedPapersResult["status"], "ok">, string> = {
  no_match: "No related papers found via Semantic Scholar for this source.",
  rate_limited: "Related papers are rate-limited right now -- try again shortly.",
  error: "Related papers are unavailable right now.",
};

/**
 * Right-rail on the default doc-reader view. Fetches GET /api/related, which
 * calls the real Semantic Scholar Recommendations API (lib/services/related.ts)
 * -- no fabricated fallback data. The bundled fixture's papers are fictional,
 * so expect `no_match` there; a real ingested paper is what populates this
 * for real, in <1s, no LLM (plan.md §1's pacing).
 */
export function RelatedPapersRail({ workspaceId, paperId }: { workspaceId: string; paperId: string | undefined }) {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    setState({ phase: "loading" });

    fetch(`/api/related?workspaceId=${encodeURIComponent(workspaceId)}&paperId=${encodeURIComponent(paperId)}`)
      .then((res) => res.json())
      .then((result: RelatedPapersResult) => {
        if (!cancelled) setState({ phase: "done", result });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "done", result: { papers: [], status: "error" } });
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, paperId]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-[11px] uppercase tracking-wide text-ink-faint">
        Related papers
      </h3>

      {state.phase === "loading" && (
        <p className="font-sans text-xs text-ink-faint">Searching Semantic Scholar...</p>
      )}

      {state.phase === "done" && state.result.status !== "ok" && (
        <p className="font-sans text-xs text-ink-faint">{STATUS_COPY[state.result.status]}</p>
      )}

      {state.phase === "done" && state.result.status === "ok" && (
        <ul className="flex flex-col gap-2">
          {state.result.papers.map((paper) => (
            <RelatedPaperCard key={paper.url} paper={paper} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RelatedPaperCard({ paper }: { paper: RelatedPaper }) {
  return (
    <li>
      <Panel className="p-3">
        <a
          href={paper.url}
          target="_blank"
          rel="noreferrer"
          className="font-serif text-sm text-ink hover:underline"
        >
          {paper.title}
        </a>
        {paper.tldr && <p className="mt-1 font-sans text-xs text-ink-muted">{paper.tldr}</p>}
        <p className="mt-1.5 font-mono text-[10px] text-ink-faint">{paper.citationCount} citations</p>
      </Panel>
    </li>
  );
}
