import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/site/LegalPage";
import { LIVE_TOOLS } from "@/lib/mcp/registry";
import { PARAPHRASE_THRESHOLD, QUOTE_LOCATED_THRESHOLD } from "@/lib/grounding/verify";
import { MAX_PAGES, MAX_UPLOAD_BYTES } from "@/lib/services/upload";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Setting up the Pepiros MCP server, what the evidence tiers mean, and how anchor ids work.",
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-paper p-s-4 font-mono text-xs leading-relaxed text-ink">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <LegalPage
      kicker="Docs"
      title="Setup and reference"
      intro="Enough to connect an agent and read the output correctly. The MCP install story used to live in one paragraph on the marketing page; it lives here now."
    >
      <Section title="Connect an agent over MCP">
        <p>
          Published on npm as <code className="font-mono text-xs">pepiros-mcp</code>. No
          clone required -- point your client at it directly.
        </p>
        <Code>{`{
  "mcpServers": {
    "pepiros": {
      "command": "npx",
      "args": ["-y", "pepiros-mcp"]
    }
  }
}`}</Code>
        <p>
          Working from a clone instead (e.g. to test a local change to{" "}
          <code className="font-mono text-xs">mcp/*</code> before it&apos;s published):
        </p>
        <Code>{`npm install
npm run mcp:stdio`}</Code>
        <Code>{`{
  "mcpServers": {
    "pepiros": {
      "command": "npx",
      "args": ["tsx", "mcp/stdio.ts"],
      "cwd": "/path/to/pepiros"
    }
  }
}`}</Code>
        <p>
          {/* Issue #319: this used to point at /mcp "for the connector URL
              and setup flow" -- /mcp only asserted the transport was live,
              it never actually stated one. The endpoint really is just the
              deployment's own origin plus /api/mcp (app/api/mcp/route.ts);
              a client that speaks OAuth-authenticated streamable-HTTP MCP
              walks discovery, dynamic registration, and PKCE from there on
              its own. */}
          A remote streamable-HTTP transport with OAuth 2.1 (dynamic client
          registration, PKCE) is also live now, for clients that can only
          reach a hosted connector rather than spawning a local process --
          point one at <code className="font-mono text-xs">/api/mcp</code> on
          this deployment&rsquo;s own origin, and it discovers the rest from{" "}
          <code className="font-mono text-xs">/.well-known/oauth-authorization-server</code>.
        </p>
      </Section>

      <Section title="Evidence tiers">
        <p>
          Every claim carries one of three states. They are not degrees of
          confidence in the research; they describe how well the claim matched
          the text it cites.
        </p>
        <ul className="ml-s-4 list-disc space-y-s-2">
          <li>
            <strong className="text-ink">quote located</strong>: the quote scored{" "}
            {QUOTE_LOCATED_THRESHOLD} or above against a real chunk of the source.
            Page and quote are both shown.
          </li>
          <li>
            <strong className="text-ink">paraphrase</strong>: scored between{" "}
            {PARAPHRASE_THRESHOLD} and {QUOTE_LOCATED_THRESHOLD}. Close, but not a
            verbatim match.
          </li>
          <li>
            <strong className="text-ink">unsupported</strong>: below{" "}
            {PARAPHRASE_THRESHOLD}. The anchor is dropped and the citation marker
            is stripped on re-verification.
          </li>
        </ul>
        <p>
          A claim with no checked excerpt at all is badged{" "}
          <strong className="text-ink">inference</strong>. Nothing is ever badged
          &ldquo;verified&rdquo;. See{" "}
          <Link href="/how-it-works" className="text-accent-text underline underline-offset-2">
            how it works
          </Link>{" "}
          for the reasoning.
        </p>
      </Section>

      <Section title="Anchor ids">
        <p>
          Anchors use stable, human-readable ids so a citation stays meaningful
          across a conversation: <code className="font-mono text-xs">C7</code> for
          a text chunk, <code className="font-mono text-xs">F3</code> for a figure,{" "}
          <code className="font-mono text-xs">N12</code> for a numeric ledger row.
        </p>
        <p>
          An anchor can span multiple rects on a page, which is how a quote
          that wraps across a column break still highlights correctly.
        </p>
      </Section>

      <Section title="Tools">
        <p>
          {/* Issue #315: hand-maintained lists of tool names have drifted
              from the real registry before (the changelog's own 2026-08-17
              entry: "The MCP tool count corrected everywhere it was wrong:
              all 12 tools in the registry are live, not 8" -- this section
              was the one place that fix never reached). Rendered straight
              from lib/mcp/registry.ts, same as /mcp's own page, so it can't
              happen again. */}
          {LIVE_TOOLS.length} tools are registered:{" "}
          {LIVE_TOOLS.map((t, i) => (
            <span key={t.name}>
              <code className="font-mono text-xs">{t.name}</code>
              {i < LIVE_TOOLS.length - 1 ? ", " : ""}
            </span>
          ))}
          . Full argument tables are on the{" "}
          <Link href="/mcp" className="text-accent-text underline underline-offset-2">
            MCP page
          </Link>
          .
        </p>
        <p>
          <code className="font-mono text-xs">create_node</code> re-verifies
          server-side and never trusts a client-asserted tier. An agent cannot
          write a claim into the graph badged &ldquo;quote located&rdquo; by simply
          saying it is.
        </p>
      </Section>

      <Section title="Limits">
        <p>
          A PDF is capped at {MAX_UPLOAD_BYTES / (1024 * 1024)}MB and{" "}
          {MAX_PAGES} pages. The size limit is checked the moment{" "}
          <Link href="/upload" className="text-accent-text underline underline-offset-2">
            the upload form
          </Link>{" "}
          sees the file; the page count can only be known after parsing, so
          that check runs server-side. Both apply the same way whether a
          paper arrives through the form or through{" "}
          <code className="font-mono text-xs">add_paper</code>, with the
          actual reason named rather than a generic failure.
        </p>
      </Section>
    </LegalPage>
  );
}
