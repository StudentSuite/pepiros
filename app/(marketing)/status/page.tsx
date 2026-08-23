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
    state: "partial",
    // Issues #230/#295: this read "live" with "both real", which is false of
    // the deployed site. Upload validation is real everywhere; the parse
    // pipeline shells out to scripts/parse.py and Vercel's Node runtime has
    // no Python interpreter, so POST /api/ingest returns 501 here. That is a
    // runtime limitation, not a configuration one, so the honest move is to
    // label it rather than imply a fix is pending.
    note: "Upload validation is real. Parsing is local-only: the pipeline shells out to Python (PyMuPDF), which the hosted Node runtime has no interpreter for, so ingesting a new paper needs a local `npm run dev`. A paper ingested locally is readable here.",
  },
  {
    area: "Cross-paper synthesis",
    state: "partial",
    note: "Real agrees/contradicts/extends/shares_method/relates edges, plus 4 of 6 spec'd synthesis node types (Consensus, Contradictions, Timeline of Findings, Methodological Divergence). Dataset Overlap and Open Questions still need signals nothing extracts yet.",
  },
  {
    area: "Export",
    state: "live",
    note: "Markdown and BibTeX export are both implemented.",
  },
  {
    area: "Accounts and publishing",
    state: "partial",
    note: "Real sign-up persists to Supabase, with a required real email so password recovery and email confirmation both actually deliver. Sessions are server-side revocable (logout, or sign out everywhere). Workspaces carry an owner, so \"my workspaces\" is scoped to the signed-in account and one account cannot write to another's. Workspaces created before that column exists are unowned and stay writable by any signed-in account, rather than being locked away from whoever built them.",
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

/** Same technique CapabilityCards.tsx uses on the homepage: a real number
 *  computed from the data already on this page, not a second source that
 *  could drift from the table below it. */
const COUNTS = (["live", "partial", "planned"] as const).map((state) => ({
  state,
  count: ROWS.filter((r) => r.state === state).length,
}));

export default function StatusPage() {
  return (
    <LegalPage
      kicker="Status"
      title="What actually works today"
      intro="A feature-by-feature breakdown of what's live, in progress, or planned, kept here so nobody has to find out by clicking."
      updated="24 August 2026"
    >
      <div className="mb-s-5 flex flex-wrap gap-s-5 font-mono text-[13px] text-ink-faint">
        {COUNTS.filter((c) => c.count > 0).map((c) => (
          <span key={c.state} className="flex items-center gap-s-2">
            <span className={`size-1.5 rounded-full ${DOT[c.state]}`} />
            <span className="text-ink">{c.count}</span> {LABEL[c.state].toLowerCase()}
          </span>
        ))}
      </div>

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
