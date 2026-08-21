"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { Chunk, EvidenceTier, Paper, Workspace } from "@/types/anchor";

/**
 * Reverse audit, the paste-a-summary surface.
 *
 * `POST /api/audit` (lib/services/audit.ts -> lib/grounding/reverseAudit.ts)
 * has existed since the reverse audit landed and nothing in the app ever
 * called it: the Audit tab rendered the workspace's own evidence rows, which
 * answers "did our generators cite honestly", not "is this summary somebody
 * else wrote true of the paper". That second question is the one the endpoint
 * was built for, and this is its UI.
 *
 * The split is the argument: the summary on the left keeps its own shape and
 * gets marked in place, the verdicts sit beside it, and the two are numbered
 * the same so a claim and its judgement are never more than an eye movement
 * apart. Same reasoning as the reader's claim-beside-source column.
 */

/** A sentence carries its verdict from `SentenceAudit` in lib/grounding/reverseAudit.ts. */
interface SentenceAudit {
  sentence: string;
  bestChunkId: string | null;
  matchScore: number;
  numericOk: boolean | null;
  tier: EvidenceTier;
}

interface AuditResponse {
  sentences: SentenceAudit[];
  dropRate: number;
}

/**
 * The results rail stays dark in both themes.
 *
 * It is not decoration: the page is a document and the rail is a verdict on
 * it, and holding them in one palette is what made the old table read as more
 * of the same prose. These are the `chrome` inks Logo already uses, so the
 * rail matches the brand's own dark ground rather than inventing a third one.
 */
const RAIL = {
  bg: "bg-[#17150f]",
  text: "text-[#f3efe7]",
  muted: "text-[#f3efe7]/55",
  faint: "text-[#f3efe7]/40",
  edge: "border-[#f3efe7]/12",
} as const;

/** Tier -> rail accent. Located and paraphrase both read as "supported" here. */
const TIER_RAIL: Record<EvidenceTier, { bar: string; label: string; text: string }> = {
  quote_located: { bar: "bg-[#8ca77c]", label: "Supported", text: "text-[#a8c096]" },
  paraphrase: { bar: "bg-[#c2a878]", label: "Paraphrase", text: "text-[#d9c092]" },
  unsupported: { bar: "bg-[#c0685c]", label: "Unsupported", text: "text-[#d98a7e]" },
};

/** Tier -> the underline drawn under the sentence itself, on the paper side. */
const TIER_UNDERLINE: Record<EvidenceTier, string> = {
  quote_located: "decoration-located",
  paraphrase: "decoration-paraphrase",
  unsupported: "decoration-unsupported",
};

/**
 * "Okafor et al., 2022".
 *
 * Surname is the last whitespace-separated token, which is what the fixture's
 * "A. Okafor" and an ingested "Ashish Vaswani" both reduce to correctly.
 */
function citeAuthors(paper: Paper): string {
  const first = paper.authors[0];
  if (!first) return paper.title;
  const surname = first.trim().split(/\s+/).pop() ?? first;
  const etAl = paper.authors.length > 1 ? " et al." : "";
  return paper.year === null ? `${surname}${etAl}` : `${surname}${etAl}, ${paper.year}`;
}

/**
 * "Methods" out of a "p1-methods" section id.
 *
 * Section ids are prefixed with their paper id at ingest, and that prefix is
 * plumbing rather than something a reader should be shown. When a section id
 * is absent the page number is the only locator there is, so the caller falls
 * back to it rather than printing an empty section.
 */
function sectionLabel(chunk: Chunk): string | null {
  if (!chunk.sectionId) return null;
  const bare = chunk.sectionId.startsWith(`${chunk.paperId}-`)
    ? chunk.sectionId.slice(chunk.paperId.length + 1)
    : chunk.sectionId;
  const words = bare.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

function SourceLine({
  audit,
  workspace,
}: {
  audit: SentenceAudit;
  workspace: Workspace;
}) {
  if (audit.tier === "unsupported" || !audit.bestChunkId) {
    return (
      <p className={clsx("flex items-center gap-2 font-sans text-xs", RAIL.muted)}>
        <span aria-hidden className={RAIL.faint}>
          &mdash;
        </span>
        {/* A numeric mismatch is a different failure from "nothing matched",
            and it is the more interesting one: the sentence did find its
            chunk and then contradicted a number in it. */}
        {audit.numericOk === false
          ? "Matched a passage, but a figure in it disagrees"
          : "No matching claim located"}
      </p>
    );
  }

  const chunk = workspace.chunks.find((c) => c.id === audit.bestChunkId);
  const paper = chunk ? workspace.papers.find((p) => p.id === chunk.paperId) : undefined;
  if (!chunk || !paper) {
    return (
      <p className={clsx("font-sans text-xs", RAIL.muted)}>Source chunk {audit.bestChunkId}</p>
    );
  }

  const section = sectionLabel(chunk);
  return (
    <p className={clsx("flex items-center gap-2 font-sans text-xs", RAIL.muted)}>
      <Icon icon={FileText} size="xs" className={RAIL.faint} />
      <span>
        {citeAuthors(paper)}
        {section ? ` · ${section}` : ""}
        {` · p.${chunk.page}`}
      </span>
    </p>
  );
}

export function SummaryAudit({ workspace }: { workspace: Workspace }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The text the current `result` describes, so editing the box cannot
   *  silently re-label verdicts as belonging to a summary they never saw. */
  const [auditedText, setAuditedText] = useState("");

  async function runAudit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, text: trimmed }),
      });
      if (!res.ok) throw new Error(`Audit failed (${res.status}).`);
      setResult((await res.json()) as AuditResponse);
      setAuditedText(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the audit.");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  const supportedCount = useMemo(
    () => result?.sentences.filter((s) => s.tier !== "unsupported").length ?? 0,
    [result],
  );

  function exportReport() {
    if (!result) return;
    const lines = [
      `# Reverse audit: ${workspace.name}`,
      "",
      `Sentences: ${result.sentences.length}`,
      `Supported: ${supportedCount}`,
      `Unsupported: ${result.sentences.length - supportedCount}`,
      `Drop rate: ${Math.round(result.dropRate * 100)}%`,
      "",
      "---",
      "",
      ...result.sentences.flatMap((s, i) => {
        const chunk = s.bestChunkId
          ? workspace.chunks.find((c) => c.id === s.bestChunkId)
          : undefined;
        const paper = chunk ? workspace.papers.find((p) => p.id === chunk.paperId) : undefined;
        const source =
          chunk && paper
            ? `${citeAuthors(paper)}${sectionLabel(chunk) ? ` · ${sectionLabel(chunk)}` : ""} · p.${chunk.page}`
            : s.numericOk === false
              ? "Matched a passage, but a figure in it disagrees"
              : "No matching claim located";
        return [
          `## ${i + 1}. ${TIER_RAIL[s.tier].label}`,
          "",
          `> ${s.sentence}`,
          "",
          // Same honesty as the rail: for a dropped sentence the sweep stops
          // early, so the number is a ceiling and is written as one.
          `- Match: ${s.tier === "unsupported" ? "≤ " : ""}${s.matchScore.toFixed(2)}`,
          `- Source: ${source}`,
          "",
        ];
      }),
      "A quote-located match proves quotation provenance, not entailment.",
      "",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reverse-audit-${workspace.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid min-h-[420px] grid-cols-1 gap-0 lg:grid-cols-[1fr_380px]">
      {/* ---------------------------------------------------------------- */}
      {/* Paper side: the summary under audit, marked in place.             */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-paper px-s-5 py-s-5 lg:px-s-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Reverse audit
        </p>
        <h2 className="mt-2 font-serif text-3xl text-ink">AI summary under audit</h2>

        {!result ? (
          <div className="mt-s-5 max-w-2xl">
            <p className="font-sans text-sm text-ink-muted">
              Paste a summary somebody else wrote &mdash; a model&apos;s, a colleague&apos;s,
              your own. Every sentence is checked against the text of the papers in this
              workspace, and the ones nothing supports are named.
            </p>
            <label htmlFor="audit-text" className="sr-only">
              Summary to audit
            </label>
            <textarea
              id="audit-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste the summary here."
              className={clsx(
                "mt-s-4 w-full resize-y rounded-md border border-border bg-surface p-s-4",
                "font-serif text-[15px] leading-relaxed text-ink placeholder:text-ink-faint",
                "focus-visible:border-accent focus-visible:outline-none",
              )}
            />
            <div className="mt-s-3 flex items-center gap-s-3">
              <Button onClick={() => void runAudit()} disabled={running || !text.trim()}>
                {running ? "Auditing…" : "Run audit"}
              </Button>
              <p className="font-sans text-xs text-ink-faint">
                {workspace.chunks.length} chunks across {workspace.papers.length}{" "}
                {workspace.papers.length === 1 ? "paper" : "papers"}
              </p>
            </div>
            {error && (
              <p className="mt-s-3 font-sans text-sm text-unsupported" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mt-2 font-sans text-sm text-ink-faint">
              Pasted summary &middot; {result.sentences.length}{" "}
              {result.sentences.length === 1 ? "sentence" : "sentences"}
            </p>
            <div className="mt-s-5 max-w-2xl">
              {result.sentences.map((s, i) => (
                <p
                  key={`${i}-${s.sentence.slice(0, 24)}`}
                  className="mb-s-4 font-serif text-[17px] leading-[1.7] text-ink"
                >
                  {/* The rail's row number, repeated here, is the whole
                      reason the two columns can be read together. */}
                  <span
                    aria-hidden
                    className="mr-2 align-super font-mono text-[10px] text-ink-faint"
                  >
                    {i + 1}
                  </span>
                  <span
                    className={clsx(
                      "underline decoration-2 underline-offset-[6px]",
                      TIER_UNDERLINE[s.tier],
                    )}
                  >
                    {s.sentence}
                  </span>
                </p>
              ))}
            </div>
            <div className="mt-s-5 flex items-center gap-s-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setText(auditedText);
                }}
              >
                Audit another summary
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Rail: one verdict per sentence, numbered to match.                */}
      {/* ---------------------------------------------------------------- */}
      <section

        className={clsx("flex flex-col", RAIL.bg, RAIL.text)}
        aria-label="Audit results"
      >
        <p
          className={clsx(
            "border-b px-s-4 py-s-4 font-mono text-[10px] uppercase tracking-widest",
            RAIL.edge,
            RAIL.faint,
          )}
        >
          Audit results
        </p>

        {!result ? (
          <p className={clsx("px-s-4 py-s-5 font-sans text-sm", RAIL.muted)}>
            Verdicts appear here, one per sentence, once an audit has run.
          </p>
        ) : (
          <>
            <ol>
              {result.sentences.map((s, i) => {
                const tier = TIER_RAIL[s.tier];
                return (
                  <li
                    key={`${i}-${s.sentence.slice(0, 24)}`}
                    className={clsx("flex gap-s-3 border-b px-s-4 py-s-4", RAIL.edge)}
                  >
                    <span aria-hidden className={clsx("w-0.5 shrink-0 rounded-full", tier.bar)} />
                    <span className={clsx("w-4 shrink-0 font-mono text-sm", RAIL.faint)}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-s-3">
                        <span
                          className={clsx(
                            "font-mono text-[11px] uppercase tracking-widest",
                            tier.text,
                          )}
                        >
                          {tier.label}
                        </span>
                        {/* For an unsupported sentence the sweep stops as soon
                            as a chunk cannot clear the threshold, so this is a
                            ceiling, not the exact similarity. Saying so costs
                            one character. */}
                        <span
                          className={clsx("shrink-0 font-mono text-xs", RAIL.faint)}
                          title={
                            s.tier === "unsupported"
                              ? "Upper bound: scoring stops once a chunk cannot clear the threshold."
                              : "token_set_ratio against the matched chunk."
                          }
                        >
                          match {s.tier === "unsupported" ? "≤" : ""}
                          {s.matchScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <SourceLine audit={s} workspace={workspace} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div
              className={clsx(
                "mt-auto flex flex-wrap items-center justify-between gap-s-3 border-t px-s-4 py-s-4",
                RAIL.edge,
              )}
            >
              <p className={clsx("flex items-center gap-2 font-sans text-sm", RAIL.muted)}>
                <span
                  aria-hidden
                  className={clsx(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    RAIL.edge,
                  )}
                >
                  <Icon icon={Check} size="xs" className={RAIL.text} />
                </span>
                Audit complete
              </p>
              <button
                type="button"
                onClick={exportReport}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-md border px-s-3 py-1.5",
                  "font-sans text-xs transition-colors duration-fast ease-out",
                  RAIL.edge,
                  RAIL.text,
                  "hover:bg-[#f3efe7]/10",
                )}
              >
                <Icon icon={Download} size="xs" />
                Export report
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
