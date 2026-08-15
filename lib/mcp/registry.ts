/**
 * The single source of truth for what MCP tools this server exposes
 * (docs/PLAN-V1.md §13.2). The tool count was previously wrong in three
 * places at three different values -- the `/mcp` marketing page, `llms.txt`,
 * and `mcp/tools/index.ts`'s actual registrations -- because each was a
 * hand-maintained list. All three now read from here: the page and
 * llms.txt import LIVE_TOOLS/PLANNED_TOOLS to render their copy, and
 * lib/mcp/registry.test.ts asserts that mcp/tools/index.ts registers
 * exactly LIVE_TOOL_NAMES, so a tool added to one without the other fails a
 * test instead of drifting silently again.
 */

export type ToolGroup = "Search and read" | "Verify and write" | "Audit" | "Workspace and ingest";

export interface ToolSpec {
  name: string;
  group: ToolGroup;
  /** Human-readable parameter signature for docs -- not a schema. */
  args: string;
  description: string;
  status: "live" | "planned";
}

export const TOOL_REGISTRY: ToolSpec[] = [
  {
    name: "list_papers",
    group: "Search and read",
    args: "workspace_id",
    description: "List the papers in a workspace with id, title, authors, year, and archetype.",
    status: "live",
  },
  {
    name: "search_paper",
    group: "Search and read",
    args: "workspace_id, query, paper_id?, k?",
    description:
      "Find chunks of paper text matching a query. Returns each chunk's stable citation id (e.g. C7), its page, and its verbatim text. Cite the returned ids -- never invent one.",
    status: "live",
  },
  {
    name: "get_outline",
    group: "Search and read",
    args: "workspace_id",
    description: "Compact text tree of the workspace: papers, their pillars, leaf titles, and evidence counts.",
    status: "live",
  },
  {
    name: "get_node",
    group: "Search and read",
    args: "workspace_id, node_id",
    description: "Fetch one node's body with its anchors resolved inline to quote, page, and deep link.",
    status: "live",
  },
  {
    name: "verify_claim",
    group: "Verify and write",
    args: "workspace_id, ref_id, quote, claim?",
    description:
      "Deterministically check whether a quote actually appears in a cited chunk. Returns quote_located / paraphrase / unsupported, the match score, page, and the numeric-entailment result. Proves quotation provenance, not that the claim follows from the quote.",
    status: "live",
  },
  {
    name: "create_node",
    group: "Verify and write",
    args: "workspace_id, parent_id?, title, body_md, evidence[]",
    description:
      "Write a claim into the graph. Submitted evidence is ALWAYS re-verified server-side against the source: a quote that fails the fuzzy match or the numeric floor has its anchor dropped and the node is marked low-confidence. You cannot assert that a quote is located.",
    status: "live",
  },
  {
    name: "find_contradictions",
    group: "Audit",
    args: "workspace_id, concept?",
    description:
      "Find claim pairs in this workspace that contradict each other. Only pairs where BOTH sides have a located quote are returned -- a one-sided contradiction is not evidence.",
    status: "live",
  },
  {
    name: "paper_facts",
    group: "Audit",
    args: "workspace_id, paper_id, kind",
    description:
      "Structured facts about one paper: numeric_ledger (every extracted statistic with its N-ref) or coverage (how much of the paper's text is actually anchored by evidence).",
    status: "live",
  },
  {
    name: "list_workspaces",
    group: "Workspace and ingest",
    args: "(none)",
    description: "List every workspace this server knows about, with id, name, and paper count.",
    status: "live",
  },
  {
    name: "create_workspace",
    group: "Workspace and ingest",
    args: "name",
    description: "Create a new, empty workspace and return its id -- ready for add_paper.",
    status: "live",
  },
  {
    name: "add_paper",
    group: "Workspace and ingest",
    args: "workspace_id, url",
    description:
      "Queue a paper (arXiv, PMC, or a direct PDF link) for ingest into a workspace. Returns a job id to poll with get_job. DOI links aren't resolvable yet.",
    status: "live",
  },
  {
    name: "get_job",
    group: "Workspace and ingest",
    args: "job_id",
    description: "Poll an ingest job's stage-by-stage progress and status.",
    status: "live",
  },
];

export const LIVE_TOOLS = TOOL_REGISTRY.filter((t) => t.status === "live");
export const PLANNED_TOOLS = TOOL_REGISTRY.filter((t) => t.status === "planned");
export const LIVE_TOOL_NAMES = LIVE_TOOLS.map((t) => t.name);
export const PLANNED_TOOL_NAMES = PLANNED_TOOLS.map((t) => t.name);

export function toolDescription(name: string): string {
  const spec = TOOL_REGISTRY.find((t) => t.name === name);
  if (!spec) throw new Error(`No registry entry for tool "${name}" -- add it to lib/mcp/registry.ts first.`);
  return spec.description;
}
