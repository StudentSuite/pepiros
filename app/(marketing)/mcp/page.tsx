import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleBody,
  ArticleHeader,
  ArticleRule,
  ReadingColumn,
} from "@/components/reading/Article";
import { AgentMock } from "@/components/mockups/ReaderMock";
import { LIVE_TOOLS, PLANNED_TOOLS, type ToolGroup } from "@/lib/mcp/registry";

export const metadata: Metadata = {
  title: "MCP Server",
  description:
    "Connect Pepiros to Claude, Codex, or Cursor over MCP. Call verify_claim so an agent can check its own output against a source, mid-conversation.",
};

/**
 * Grouped straight from lib/mcp/registry.ts -- the single source of truth
 * mcp/tools/index.ts's actual registrations are tested against
 * (lib/mcp/registry.test.ts). This page previously hand-maintained its own
 * copy of this list and drifted from what was actually registered; it can't
 * anymore, since there's nothing left here to drift.
 */
const GROUPS: ToolGroup[] = ["Search and read", "Verify and write", "Audit", "Workspace and ingest"];
const TOOLS = GROUPS.map((group) => ({
  group,
  items: LIVE_TOOLS.filter((t) => t.group === group),
})).filter((g) => g.items.length > 0);

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
          {LIVE_TOOLS.length} tools, live today
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
                    {/* Stacked, not inline. Some signatures run to 60
                        characters and an unbreakable inline pair pushed the
                        page past the viewport at 320 and 390px. */}
                    <code className="block font-mono text-sm text-ink">{t.name}</code>
                    <code className="mt-0.5 block break-words font-mono text-[11px] leading-relaxed text-ink-faint">
                      ({t.args})
                    </code>
                    <p className="mt-1 font-sans text-[14px] leading-relaxed text-ink-muted">
                      {t.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {PLANNED_TOOLS.length > 0 && (
          <div className="mt-s-6 rounded-md border border-dashed border-border p-s-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Planned, not yet registered
            </p>
            <p className="mt-s-2 font-sans text-[14px] leading-relaxed text-ink-muted">
              {PLANNED_TOOLS.map((t) => (
                <code key={t.name} className="mr-2 inline-block break-words font-mono text-[13px] text-ink">
                  {t.name}
                </code>
              ))}
            </p>
            <p className="mt-s-2 font-sans text-[13px] leading-relaxed text-ink-faint">
              Listed here so an agent does not discover their absence by calling one.
            </p>
          </div>
        )}

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
            <code>package.json</code> now has a real <code>bin</code> entry (
            <code>pepiros-mcp</code>) and a <code>build:mcp</code> script that
            bundles the tool layer to a single standalone file with esbuild --
            <code>npx pepiros-mcp</code> will work once the package is
            published. It is not published yet, so that one-liner is not live
            today. Remote HTTP with OAuth, for hosted connectors, is the next
            step after that rather than a shipped feature.
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
