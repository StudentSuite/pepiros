"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { Evidence } from "@/types/anchor";
import { RefChip } from "@/components/ui/RefChip";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { ReaderTabsNav } from "@/components/reader/ReaderTabsNav";

type EvidenceWithTesting = Evidence & { claimedQuoteForTesting?: string };

function Stat({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: string | number;
  accentClassName?: string;
}) {
  return (
    <div className="rounded border border-border bg-surface-raised p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p>
      <p className={clsx("mt-1 font-serif text-2xl", accentClassName ?? "text-ink")}>{value}</p>
    </div>
  );
}

/**
 * Reverse audit view (plan.md §9): every Evidence row across the workspace,
 * its tier, and the computed drop rate (unsupported / total) -- "plant one
 * misattribution, measure drop rate" made visible. The fixture's planted
 * case is evidence "e6" on n-p2-limitations-leaf-1: tier unsupported,
 * anchor null, and its owning node's bodyMd still carries the [^e6] marker
 * -- that stale-marker case gets its own callout below, not just a table row.
 */
export function AuditClient({ workspaceId }: { workspaceId: string }) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);

  useEffect(() => {
    loadWorkspace(workspaceId);
  }, [workspaceId, loadWorkspace]);

  if (!workspace) {
    return <p className="p-8 font-sans text-sm text-ink-faint">Loading workspace...</p>;
  }

  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n]));

  const total = workspace.evidence.length;
  const locatedCount = workspace.evidence.filter((e) => e.tier === "quote_located").length;
  const paraphraseCount = workspace.evidence.filter((e) => e.tier === "paraphrase").length;
  const unsupportedCount = workspace.evidence.filter((e) => e.tier === "unsupported").length;
  const dropRate = total > 0 ? unsupportedCount / total : 0;

  const staleMarkers = workspace.evidence.filter((e) => {
    if (e.tier !== "unsupported") return false;
    const node = nodeById.get(e.nodeId);
    return !!node && node.bodyMd.includes(`[^${e.id}]`);
  });

  return (
    <main className="mx-auto max-w-6xl px-s-5 py-s-6">
      <header className="mb-s-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Audit</h1>
        <ReaderTabsNav workspaceId={workspaceId} active="audit" />
      </header>

      <section className="mb-s-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total evidence" value={total} />
        <Stat label="Quote located" value={locatedCount} accentClassName="text-located" />
        <Stat label="Paraphrase" value={paraphraseCount} accentClassName="text-paraphrase" />
        <Stat
          label="Drop rate"
          value={`${Math.round(dropRate * 100)}%`}
          accentClassName="text-unsupported"
        />
      </section>

      {staleMarkers.length > 0 && (
        <section className="mb-s-6 rounded border border-unsupported/50 bg-unsupported/5 p-s-4">
          <h2 className="mb-1.5 font-sans text-sm font-medium text-unsupported">
            Stale citation markers ({staleMarkers.length})
          </h2>
          <p className="mb-3 font-sans text-xs text-ink-muted">
            These nodes still show a citation marker for evidence that came back
            unsupported and had its anchor dropped. The marker is cleared the next
            time the node is re-verified.
          </p>
          <ul className="flex flex-col gap-1.5">
            {staleMarkers.map((e) => {
              const node = nodeById.get(e.nodeId);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-2 font-sans text-xs">
                  <RefChip refId={e.refId} />
                  <span className="text-ink">{node?.title ?? e.nodeId}</span>
                  <span className="font-mono text-ink-faint">[^{e.id}]</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-sans text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="py-2 pr-3 font-normal">Ref</th>
              <th className="py-2 pr-3 font-normal">Node</th>
              <th className="py-2 pr-3 font-normal">Tier</th>
              <th className="py-2 pr-3 font-normal">Quote</th>
              <th className="py-2 pr-3 font-normal">Match</th>
              <th className="py-2 pr-3 font-normal">Numeric</th>
            </tr>
          </thead>
          <tbody>
            {workspace.evidence.map((e) => {
              const node = nodeById.get(e.nodeId);
              const claimedQuote = (e as EvidenceWithTesting).claimedQuoteForTesting;
              return (
                <tr
                  key={e.id}
                  className={clsx(
                    "border-b border-border/50 align-top",
                    e.tier === "unsupported" && "bg-unsupported/5",
                  )}
                >
                  <td className="py-2 pr-3">
                    <RefChip refId={e.refId} />
                  </td>
                  <td className="py-2 pr-3 text-ink-muted">{node?.title ?? e.nodeId}</td>
                  <td className="py-2 pr-3">
                    <EvidenceBadge tier={e.tier} />
                  </td>
                  <td className="max-w-sm py-2 pr-3">
                    {e.anchor ? (
                      <span className="font-serif italic text-ink">&ldquo;{e.anchor.quote}&rdquo;</span>
                    ) : (
                      <span className="text-ink-muted">
                        (dropped)
                        {typeof claimedQuote === "string" && (
                          <>
                            {" "}
                            <span className="font-serif italic text-ink-faint line-through decoration-unsupported/60">
                              &ldquo;{claimedQuote}&rdquo;
                            </span>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-ink-faint">
                    {Math.round(e.matchScore * 100)}%
                  </td>
                  <td className="py-2 pr-3 font-mono text-ink-faint">
                    {e.numericOk === null ? "n/a" : e.numericOk ? "ok" : "mismatch"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
