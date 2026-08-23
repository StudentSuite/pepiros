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
        // Issue #319: this item used to say workspace ownership itself
        // wasn't built ("no owner column today"). It shipped 2026-08-21
        // (lib/db/schema.ts's real owner_id column, enforced in
        // lib/services/workspaceAccess.ts) and the status page has said so
        // since -- this roadmap entry just never caught up. What's
        // actually still missing is narrower: a web UI to create one.
        title: "A web UI to create a workspace",
        note: "Workspace ownership itself is real now -- \"my workspaces\" is scoped to who's signed in, and one account can't write to another's. There's still no \"create a workspace\" route in the web app, though; MCP's create_workspace tool is the only way to mint one today.",
      },
      {
        title: "Session refresh",
        note: "A session is revocable now (logout, or sign-out-everywhere), but it still simply expires at its 7-day lifetime with no silent renewal.",
      },
    ],
  },
  {
    horizon: "Later, or maybe never",
    items: [
      // Issue #319: "Remote MCP over HTTP with OAuth" used to sit here.
      // It shipped (app/api/mcp/route.ts's streamable-HTTP transport,
      // real OAuth 2.1 dynamic client registration/PKCE at
      // app/api/mcp/oauth/*), and both /docs and /mcp already say so --
      // this was the one page that hadn't caught up. Removed rather than
      // reworded: a roadmap lists what isn't done yet, and this is.
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
                <p className="font-sans text-base font-medium text-ink">{it.title}</p>
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
