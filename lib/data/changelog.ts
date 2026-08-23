/**
 * The changelog, newest first.
 *
 * Lifted out of app/(marketing)/changelog/page.tsx 2026-08-23 so the signed-in
 * dashboard's "What's new" panel and the public page read the SAME list. It
 * was about to be copied into a second file, which is exactly how the /mcp
 * page's tool list drifted from what was actually registered.
 *
 * Hand-maintained on purpose: this is editorial, not derived. Nothing can
 * generate "what changed and why it mattered" from git history.
 */
export interface ChangelogEntry {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-08-17",
    title: "Real accounts, real ingest, and cross-paper synthesis",
    items: [
      "Real Postgres backing everything, not just the demo fixture: migrations applied, and CI now runs against a real database on every push.",
      "Real username/password accounts, with a required real email so password recovery and email confirmation both actually work, on top of the existing Google sign-in. Sessions are now revocable -- signing out kills that session server-side, and a new \"sign out everywhere\" action in Security settings kills every session for the account.",
      "Real PDF ingest end to end: parsing, author/publication year/archetype extraction, and the reader's PDF page view are all real now, not a styled mock. A scanned or image-only PDF fails clearly instead of silently ingesting nothing.",
      "Cross-paper synthesis: real agrees/contradicts/extends/shares_method/relates edges, plus Consensus, Contradictions, Timeline of Findings, and Methodological Divergence synthesis nodes.",
      "Node body edits now re-verify every citation against the edited text and keep a version history; deleting a node cascades correctly.",
      "Export and promote-to-thread are both real.",
      "The MCP tool count corrected everywhere it was wrong: all 12 tools in the registry are live, not 8.",
      "Every workspace-scoped route that mutates data now requires a real session; an unrecognized workspace id 404s instead of silently serving the demo workspace.",
      "The four reader subpages (Audit, Outline, Learn, Canvas) now share one navigation shell, spacing scale, and guest banner.",
      "Vercel Analytics installed.",
    ],
  },
  {
    date: "2026-08-15",
    title: "Day mode, new brand, and a real account",
    items: [
      "Day and dark themes, with day as the default and a three-way toggle. The site was previously dark only.",
      "New brand kit throughout: glyph, wordmark, favicons, social cards.",
      "New landing hero, with art that changes between themes.",
      "A signed-in shell with one sidebar, replacing five separately built page headers.",
      "Creator dashboard: reach over time, engagement per post, and a sortable posts table.",
      "guest / guest demo account, so the product can be looked at without signing up.",
      "Seven-step onboarding, with each step in the URL so it can be resumed.",
      "Discover rebuilt as a ranked feed over 24 real open-access papers.",
      "Settings split into five linkable sections.",
      "New pages: privacy, terms, security, status, docs, FAQ, roadmap, changelog.",
      "Corrected the MCP page, which advertised twelve tools where eight exist, and an install command that could not resolve.",
    ],
  },
  {
    date: "2026-08-13",
    title: "Grounding spine",
    items: [
      "Deterministic verifier with the 0.92 and 0.75 thresholds.",
      "Entailment overlap floor over the numeric ledger.",
      "Reverse audit: paste a summary, get it checked sentence by sentence.",
      "MCP server over stdio with eight tools.",
      "Grounded chat that refuses rather than guessing.",
    ],
  },
];
