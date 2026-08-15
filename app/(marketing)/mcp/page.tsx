import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleBody,
  ArticleHeader,
  ArticleRule,
  ReadingColumn,
} from "@/components/reading/Article";
import { AgentMock } from "@/components/mockups/ReaderMock";

export const metadata: Metadata = {
  title: "MCP Server",
  description:
    "Connect Pepiros to Claude, Codex, or Cursor over MCP. Call verify_claim so an agent can check its own output against a source, mid-conversation.",
};

/**
 * The tools that are actually registered in mcp/tools/index.ts.
 *
 * This list previously advertised twelve, of which only eight existed, so an
 * agent reading the page would call a tool that was not there. Anything not yet
 * built is in PLANNED below and labelled as such.
 */
const TOOLS = [
  {
    group: "Search and read",
    items: [
      { name: "list_papers", args: "workspace_id", desc: "Titles, authors, year, archetype, status." },
      { name: "search_paper", args: "workspace_id, query, paper_id?, k?", desc: "Returns [C7 | Methods | p.4] chunks plus verbatim text." },
      { name: "get_outline", args: "workspace_id", desc: "Pillars, leaf titles and evidence counts, as a compact tree." },
      { name: "get_node", args: "node_id", desc: "A node's body, with anchors resolved inline to quote, page and deep link." },
    ],
  },
  {
    group: "Verify and write",
    items: [
      { name: "verify_claim", args: "paper_id, claim, quote?", desc: "Re-verifies server-side and returns quote_located, paraphrase, or unsupported, with a match score and page." },
      { name: "create_node", args: "workspace_id, parent_id?, title, body_md, evidence[]", desc: "Writes an audited node in. Re-verifies server-side, and never trusts a client-asserted tier." },
    ],
  },
  {
    group: "Audit",
    items: [
      { name: "find_contradictions", args: "workspace_id, concept?", desc: "Pairs with two-sided evidence, both quotes, both deep links." },
      { name: "paper_facts", args: "paper_id, kind", desc: "Numeric ledger, coverage, references, or does-not-establish, for one paper." },
    ],
  },
] as const;

const PLANNED = ["list_workspaces", "create_workspace", "add_paper", "get_job"] as const;

export default function McpPage() {
  return (
    <main className="pb-s-8">
      <ReadingColumn>
        <ArticleHeader
          kicker="For agents"
          title="Let your agent check its own claims."
          dek="Connect over MCP and it can verify what it is about to tell you, against the source, before it says it."
        />

        <ArticleBody>
          <p>
            An agent that summarises a paper is guessing at how faithful it is
            being. Connected to Pepiros, it does not have to guess: it calls{" "}
            <code>verify_claim</code> on its own sentences and gets back a tier,
            a match score, and the page the quote sits on.
          </p>
          <p>
            The useful part is what happens when a claim fails. The agent finds
            out mid-answer, and can say so, rather than asserting it and leaving
            you to catch it later.
          </p>
        </ArticleBody>

        <div className="mt-s-6">
          <AgentMock />
        </div>

        <ArticleRule />

        <h2 className="font-serif text-[1.45rem] leading-snug text-ink">
          Eight tools, live today
        </h2>
        <div className="mt-s-5 flex flex-col gap-s-6">
          {TOOLS.map((group) => (
            <section key={group.group}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                {group.group}
              </h3>
              <ul className="mt-s-3 flex flex-col">
                {group.items.map((t) => (
                  <li key={t.name} className="border-b border-border py-s-3 last:border-b-0">
                    <div className="flex flex-wrap items-baseline gap-x-s-2">
                      <code className="font-mono text-sm text-ink">{t.name}</code>
                      <code className="min-w-0 break-all font-mono text-[11px] text-ink-faint">
                        ({t.args})
                      </code>
                    </div>
                    <p className="mt-1 font-sans text-[14px] leading-relaxed text-ink-muted">
                      {t.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-s-6 rounded-md border border-dashed border-border p-s-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Planned, not yet registered
          </p>
          <p className="mt-s-2 font-sans text-[14px] leading-relaxed text-ink-muted">
            {PLANNED.map((p) => (
              <code key={p} className="mr-2 font-mono text-[13px] text-ink">
                {p}
              </code>
            ))}
          </p>
          <p className="mt-s-2 font-sans text-[13px] leading-relaxed text-ink-faint">
            Workspace management and ingest are not exposed over MCP yet. They
            are listed here so an agent does not discover their absence by
            calling one.
          </p>
        </div>

        <ArticleRule />

        <h2 className="font-serif text-[1.45rem] leading-snug text-ink">Install</h2>
        <ArticleBody className="mt-s-4">
          <p>
            The server runs over stdio and works with Claude, Codex and Cursor
            today. From a clone of the repository:
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-surface-sunken/60 px-s-4 py-s-3">
            <code className="font-mono text-[13px] text-ink">npm run mcp:stdio</code>
          </pre>
          <p>
            It is not published to npm yet, so there is no{" "}
            <code>npx</code> one-liner. Remote HTTP with OAuth, for hosted
            connectors, is the next step rather than a shipped feature.
          </p>
          <p>
            Tokens are managed in{" "}
            <Link href="/settings/mcp-tokens">settings</Link>, and the tiers the
            tools return are explained on{" "}
            <Link href="/how-it-works">how it works</Link>.
          </p>
        </ArticleBody>
      </ReadingColumn>
    </main>
  );
}
