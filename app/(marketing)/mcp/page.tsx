import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { Reveal } from "@/components/ui/Reveal";

interface McpTool {
  name: string;
  args: string;
  description: string;
}

// The 12 MCP tools, docs/PLAN-V1.md §13.2 table. plan.md §7 only names 4 of
// them (search_paper, verify_claim, create_node, find_contradictions) and
// points at the fuller doc for the rest -- args and descriptions below are
// taken from that table, condensed to one line each, not invented. Grouped
// into 4 rows by what they do, per the task brief's suggested grouping.
const TOOL_GROUPS: ReadonlyArray<{ title: string; tools: McpTool[] }> = [
  {
    title: "Workspace & papers",
    tools: [
      { name: "list_workspaces", args: "none", description: "List workspaces: id, title, paper count." },
      { name: "create_workspace", args: "title", description: "Create a new workspace." },
      {
        name: "add_paper",
        args: "workspace_id, url | upload_ref",
        description: "Add a paper by URL or upload, returns a job id.",
      },
      { name: "get_job", args: "job_id", description: "Check an ingest job's stage, progress, error." },
      {
        name: "list_papers",
        args: "workspace_id",
        description: "List a workspace's papers: title, authors, year, archetype, status.",
      },
    ],
  },
  {
    title: "Search & read",
    tools: [
      {
        name: "search_paper",
        args: "workspace_id, query, paper_id?, k?",
        description: "Search a paper, returns [C7 | Methods | p.4] chunks plus verbatim text.",
      },
      {
        name: "get_outline",
        args: "workspace_id",
        description: "Pillars, leaf titles, evidence counts, as a compact text tree.",
      },
      {
        name: "get_node",
        args: "node_id",
        description: "A node's body, anchors resolved inline to quote, page, deep link.",
      },
    ],
  },
  {
    title: "Verify & create",
    tools: [
      {
        name: "verify_claim",
        args: "paper_id, claim, quote?",
        description:
          "Deterministic, re-verifies server-side: quote_located, paraphrase, or unsupported, with match score, page, and a deep link.",
      },
      {
        name: "create_node",
        args: "workspace_id, parent_id?, title, body_md, evidence[]",
        description:
          "Writes an audited node into the graph. Re-verifies server-side, never trusts a client-asserted quote_located.",
      },
    ],
  },
  {
    title: "Audit",
    tools: [
      {
        name: "find_contradictions",
        args: "workspace_id, concept?",
        description: "Pairs with two-sided evidence, both quotes, both deep links.",
      },
      {
        name: "paper_facts",
        args: "paper_id, kind",
        description: "Numeric ledger, coverage, references, or does-not-establish, for one paper.",
      },
    ],
  },
];

// The demo beat, plan.md §7 / docs/PLAN-V1.md §13.5, as 4 explicit steps --
// more detail than the home page's condensed 3-line mini-transcript.
const DEMO_STEPS: ReadonlyArray<{ title: string; body: string; tool?: string }> = [
  {
    title: "Ask, no Pepiros tab open",
    body: '"Summarize this RCT’s primary outcome." Claude answers from its own reading, nothing looked up yet.',
  },
  {
    title: "Verify every claim",
    body: '"Now verify every claim you just made." Claude calls this on each of its own sentences.',
    tool: "verify_claim",
  },
  {
    title: "One comes back unsupported",
    body: "Two claims return quote_located with page numbers. One returns unsupported, and Claude says so out loud, mid-answer.",
  },
  {
    title: "The audit gets written into the graph",
    body: "Claude calls this to write the audited result in. The returned link opens the canvas with the new node already anchored and highlighted in the PDF.",
    tool: "create_node",
  },
];

/**
 * `/mcp` -- the "For Claude" pitch, unpacked. Hero -> the 12-tool grid ->
 * the demo-beat storyboard -> install line -> transport note -> CTA back to
 * the demo workspace. Header/footer come from app/(marketing)/layout.tsx.
 */
export default function McpPage() {
  return (
    <main className="flex flex-col">
      {/* Hero. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 pb-16 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">For Claude</p>
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Turn Claude into a fact-checker with a source.
        </h1>
        <p className="max-w-xl font-sans text-base leading-relaxed text-ink-muted">
          Twelve tools over MCP. Claude can search a paper, verify its own claims against the
          source, and write the audited result back into the graph, live, mid-conversation.
        </p>
      </section>

      {/* The 12 tools, grouped. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="mb-6 font-mono text-xs uppercase tracking-widest text-ink-faint">
              12 tools
            </p>
            <div className="flex flex-col gap-8">
              {TOOL_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="font-serif text-sm text-ink-muted">{group.title}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {group.tools.map((tool) => (
                      <div
                        key={tool.name}
                        className="flex flex-col gap-1.5 rounded border border-border bg-surface-raised p-s-4"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs text-ink">{tool.name}</span>
                          <span className="font-mono text-[10px] text-ink-faint">
                            {tool.args}
                          </span>
                        </div>
                        <p className="font-sans text-xs leading-relaxed text-ink-faint">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Demo-beat storyboard. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              The demo beat
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">
              Self-auditing, inside a Claude conversation
            </h2>

            <ol className="mt-8 flex flex-col gap-6">
              {DEMO_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-mono text-sm text-ink-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-sans text-sm text-ink">{step.title}</p>
                    <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
                      {step.body}
                    </p>
                    {step.tool && (
                      <div className="mt-0.5">
                        <Badge variant="tag">{step.tool}</Badge>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="mt-0.5">
                        <EvidenceBadge tier="unsupported" />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </Reveal>

      {/* Install + transport. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Install
            </p>
            <div className="surface-reading paper-grain mt-4 max-w-md rounded-lg p-s-5">
              <pre className="overflow-x-auto font-mono text-sm text-[#1c1a15]">
                <code>npx pepiros-mcp</code>
              </pre>
            </div>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Ships stdio-first for Claude Code and Desktop. Remote HTTP with OAuth, for claude.ai
              Connectors, is the stretch goal.
            </p>
          </div>
        </section>
      </Reveal>

      {/* CTA. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-16">
            <Link href="/workspaces" className={buttonClassName("primary")}>
              Try the demo workspace
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
