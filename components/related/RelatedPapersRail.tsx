"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { SkeletonText } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { RelatedPaper, RelatedPapersResult } from "@/lib/services/related";

type State =
  | { phase: "loading" }
  | { phase: "done"; result: RelatedPapersResult };

/**
 * Right-rail on the default doc-reader view. Fetches GET /api/related, which
 * calls the real Semantic Scholar Recommendations API (lib/services/related.ts)
 * -- no fabricated fallback data. The bundled fixture's papers are fictional,
 * so expect `no_match` there; a real ingested paper is what populates this
 * for real, in <1s, no LLM (plan.md §1's pacing).
 *
 * This is a genuinely live fetch (unlike most of the fixture-backed app), so
 * it's where the real error/rate-limit states from docs/PLAN-V1.md §14.5
 * actually have somewhere to attach -- Retry re-runs the same fetch.
 */
export function RelatedPapersRail({ workspaceId, paperId }: { workspaceId: string; paperId: string | undefined }) {
  const [state, setState] = useState<State>({ phase: "loading" });

  const load = useCallback(() => {
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

  useEffect(() => load(), [load]);

  return (
    // Issue #149: was a bare div with no outer card at all -- only per-item
    // Panels below -- while GraphPreviewCard.tsx wraps its whole widget in
    // one <Panel padded>. Matched that so the rail reads as one system
    // instead of three different card idioms bolted together.
    <Panel padded className="flex flex-col gap-2">
      <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-faint">
        Related papers
      </h3>

      {state.phase === "loading" && <SkeletonText lines={2} />}

      {state.phase === "done" && state.result.status === "no_match" && (
        <p className="font-sans text-xs text-ink-faint">
          No related papers found via Semantic Scholar for this source.
        </p>
      )}

      {state.phase === "done" && state.result.status === "rate_limited" && (
        <ErrorBanner
          variant="warn"
          message="Related papers are rate-limited right now."
          onRetry={load}
        />
      )}

      {state.phase === "done" && state.result.status === "error" && (
        <ErrorBanner variant="error" message="Related papers are unavailable right now." onRetry={load} />
      )}

      {state.phase === "done" && state.result.status === "ok" && (
        <ul className="flex flex-col gap-3">
          {state.result.papers.map((paper) => (
            <RelatedPaperCard key={paper.url} paper={paper} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RelatedPaperCard({ paper }: { paper: RelatedPaper }) {
  return (
    // Plain list item, not a nested Panel -- the rail itself is the one
    // Panel now (issue #149); a full bordered/shadowed card per item inside
    // that would just be a panel nested in a panel.
    <li className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div>
        <a
          href={paper.url}
          target="_blank"
          rel="noreferrer"
          className="font-sans text-sm text-ink hover:underline"
        >
          {paper.title}
        </a>
        {paper.tldr && <p className="mt-1 font-sans text-xs text-ink-muted">{paper.tldr}</p>}
        <p className="mt-1.5 font-mono text-2xs text-ink-faint">{paper.citationCount} citations</p>
      </div>
    </li>
  );
}
