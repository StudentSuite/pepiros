import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "What Pepiros is working on next, in rough order.",
};

const GROUPS: { horizon: string; items: { title: string; note: string }[] }[] = [
  {
    horizon: "Next",
    items: [
      {
        title: "Real PDF ingest",
        note: "Upload validation already works. Parsing a PDF into sections, chunks, figures and a numeric ledger is the missing half.",
      },
      {
        title: "The four remaining MCP tools",
        note: "list_workspaces, create_workspace, add_paper, get_job. They are thin wrappers over services that already exist.",
      },
      {
        title: "Node writes",
        note: "Editing a node body and promoting a chat answer into the graph both have UI and no backend.",
      },
    ],
  },
  {
    horizon: "After that",
    items: [
      {
        title: "Contradiction synthesis",
        note: "Existing contradiction edges render today. Generating new ones across papers is not built.",
      },
      {
        title: "Export",
        note: "Markdown and BibTeX, with anchors preserved as footnotes.",
      },
      {
        title: "Real accounts",
        note: "Supabase auth, so publishing and following do something. The schema is written and unapplied.",
      },
    ],
  },
  {
    horizon: "Later, or maybe never",
    items: [
      {
        title: "Remote MCP over HTTP with OAuth",
        note: "For hosted connectors. stdio covers the current use case.",
      },
      {
        title: "Spaced repetition",
        note: "Flashcards exist but are synthesised at render. Real scheduling was cut deliberately.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <LegalPage
      kicker="Roadmap"
      title="What is next"
      intro="Rough order, not dates. This is a two-person project and anything here can move."
    >
      {GROUPS.map((g) => (
        <section key={g.horizon}>
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
            {g.horizon}
          </h2>
          <ul className="mt-s-3 flex flex-col gap-s-3">
            {g.items.map((it) => (
              <li key={it.title} className="rounded-md border border-border p-s-4">
                <p className="font-serif text-base text-ink">{it.title}</p>
                <p className="mt-s-2 font-sans text-sm leading-relaxed text-ink-muted">
                  {it.note}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="font-sans text-sm text-ink-muted">
        What already works is on the{" "}
        <Link href="/status" className="text-accent-text underline underline-offset-2">
          status page
        </Link>
        .
      </p>
    </LegalPage>
  );
}
