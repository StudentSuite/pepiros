import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Status",
  description:
    "What works in Pepiros today, what is partly built, and what is not built yet.",
};

type State = "live" | "partial" | "planned";

const ROWS: { area: string; state: State; note: string }[] = [
  {
    area: "Deterministic verifier",
    state: "live",
    note: "Fuzzy match against source text, plus the numeric entailment floor.",
  },
  {
    area: "Anchor spine",
    state: "live",
    note: "Stable citation ids, multi-span anchors, dropped-anchor handling.",
  },
  {
    area: "Reverse audit",
    state: "live",
    note: "Paste any AI summary and get it checked sentence by sentence.",
  },
  {
    area: "Grounded chat",
    state: "live",
    note: "Answers cite located quotes, and refuse rather than guess.",
  },
  {
    area: "Related papers",
    state: "live",
    note: "Live lookup against Semantic Scholar.",
  },
  {
    area: "Citation expansion",
    state: "live",
    note: "Reading the citation graph and adding a ghost node to the workspace both work.",
  },
  {
    area: "MCP server",
    state: "partial",
    note: "Twelve tools registered over stdio, all live. Remote HTTP transport is not built.",
  },
  {
    area: "Reading surface",
    state: "partial",
    note: "The reader, canvas, outline, audit and learn views work against the demo workspace and any real ingested paper alike.",
  },
  {
    area: "PDF ingest",
    state: "live",
    note: "Upload validation and parsing a PDF (or arXiv link) into the graph are both real.",
  },
  {
    area: "Contradiction synthesis",
    state: "live",
    note: "Existing contradiction edges are shown, and new ones are generated from cross-paper comparison.",
  },
  {
    area: "Export",
    state: "live",
    note: "Markdown and BibTeX export are both implemented.",
  },
  {
    area: "Accounts and publishing",
    state: "partial",
    note: "Real sign-up persists to Supabase, including an optional email for password recovery. Password-reset email delivery itself is not wired yet.",
  },
];

const LABEL: Record<State, string> = {
  live: "Working",
  partial: "Partly built",
  planned: "Not built yet",
};

const DOT: Record<State, string> = {
  live: "bg-pillar-7",
  partial: "bg-pillar-6",
  planned: "bg-pillar-1",
};

export default function StatusPage() {
  return (
    <LegalPage
      kicker="Status"
      title="What actually works today"
      intro="Pepiros is an early build and some of it is scaffolding. This page is the honest inventory, kept here so nobody has to find out by clicking."
      updated="15 August 2026"
    >
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-s-4 py-s-3 font-mono text-[11px] uppercase tracking-widest text-ink-faint">
                Area
              </th>
              <th className="px-s-4 py-s-3 font-mono text-[11px] uppercase tracking-widest text-ink-faint">
                State
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.area} className="border-b border-border last:border-0">
                <td className="px-s-4 py-s-3 align-top">
                  <p className="font-sans text-sm text-ink">{r.area}</p>
                  <p className="mt-0.5 font-sans text-xs text-ink-faint">{r.note}</p>
                </td>
                <td className="whitespace-nowrap px-s-4 py-s-3 align-top">
                  <span className="flex items-center gap-s-2 font-mono text-[11px] text-ink-muted">
                    <span className={`size-1.5 rounded-full ${DOT[r.state]}`} />
                    {LABEL[r.state]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LegalPage>
  );
}
