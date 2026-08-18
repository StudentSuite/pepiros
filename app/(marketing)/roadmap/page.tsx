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
        title: "OCR fallback for scanned PDFs",
        note: "A scanned or image-only PDF now fails the ingest job with a clear message instead of silently producing nothing, but there's no way to actually recover text from one yet.",
      },
      {
        title: "Dataset Overlap and Open Questions synthesis",
        note: "Consensus, Contradictions, Timeline of Findings, and Methodological Divergence are all real. These two need signals nothing in the pipeline extracts yet -- dataset identifiers, a genuine gap-in-the-literature judgment.",
      },
    ],
  },
  {
    horizon: "After that",
    items: [
      {
        title: "Per-account workspace ownership",
        note: "A workspace has no owner column today, so \"my workspaces\" is server-wide, not scoped to who's signed in. The web app also has no \"create a workspace\" route of its own yet -- only MCP's create_workspace tool does that.",
      },
      {
        title: "Session refresh",
        note: "A session is revocable now (logout, or sign-out-everywhere), but it still simply expires at its 7-day lifetime with no silent renewal.",
      },
      {
        title: "MCP package publish",
        note: "The tool layer, bin entry, and esbuild bundle are all real. Publishing to npm is a maintainer decision (account, package-name availability), not a code gap.",
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
