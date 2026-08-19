import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/site/LegalPage";

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
          A remote streamable-HTTP transport with OAuth 2.1 (dynamic client
          registration, PKCE) is also live now, for clients that can only
          reach a hosted connector rather than spawning a local process --
          see <Link href="/mcp">the agents page</Link> for the connector URL
          and setup flow.
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
            <strong className="text-ink">quote located</strong>: the quote scored
            0.92 or above against a real chunk of the source. Page and quote are
            both shown.
          </li>
          <li>
            <strong className="text-ink">paraphrase</strong>: scored between 0.75
            and 0.92. Close, but not a verbatim match.
          </li>
          <li>
            <strong className="text-ink">unsupported</strong>: below 0.75. The
            anchor is dropped and the citation marker is stripped on
            re-verification.
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
          Eight tools are registered: <code className="font-mono text-xs">list_papers</code>,{" "}
          <code className="font-mono text-xs">search_paper</code>,{" "}
          <code className="font-mono text-xs">verify_claim</code>,{" "}
          <code className="font-mono text-xs">get_outline</code>,{" "}
          <code className="font-mono text-xs">get_node</code>,{" "}
          <code className="font-mono text-xs">create_node</code>,{" "}
          <code className="font-mono text-xs">find_contradictions</code>, and{" "}
          <code className="font-mono text-xs">paper_facts</code>. Full argument
          tables are on the{" "}
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
    </LegalPage>
  );
}
