import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What changed in Pepiros, newest first.",
};

const ENTRIES: { date: string; title: string; items: string[] }[] = [
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

export default function ChangelogPage() {
  return (
    <LegalPage
      kicker="Changelog"
      title="What changed"
      intro="Newest first. Early-build pace, so entries are grouped by day rather than by release."
    >
      {ENTRIES.map((e) => (
        <section key={e.date}>
          <div className="flex items-baseline gap-s-3">
            <span className="font-mono text-[11px] text-ink-faint">{e.date}</span>
            <h2 className="font-serif text-lg text-ink">{e.title}</h2>
          </div>
          <ul className="mt-s-3 ml-s-4 list-disc space-y-s-2 font-sans text-sm leading-relaxed text-ink-muted">
            {e.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </LegalPage>
  );
}
