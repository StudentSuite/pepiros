import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWorkspace } from "@/lib/services/workspace";
import { verifyClaimsAgainstCorpus } from "@/lib/services/verify";
import { paperCoverage, paperNumericLedger, searchPaper } from "@/lib/services/search";
import {
  createNode,
  findContradictions,
  getNode,
  getOutline,
  nodeDeepLink,
} from "@/lib/services/nodes";

/**
 * MCP tool layer (docs/PLAN-V1.md §13.2). 7 of the spec's 12 are registered
 * here; `list_workspaces`/`create_workspace` need real multi-workspace
 * persistence and `add_paper`/`get_job` need the ingest pipeline, none of
 * which exist yet (CLAUDE.md's current data seam).
 *
 * Two rules from §13.2 govern everything below:
 *
 * 1. Every result carries the verbatim quote, page, and a deep link. Claude
 *    cannot see the canvas, so text plus link is the entire interface.
 * 2. Tools call `lib/services/*` only -- never `lib/grounding/*` or
 *    `lib/db/*` directly -- so the HTTP and MCP surfaces re-verify through
 *    one path. `create_node` in particular re-runs the real verifier rather
 *    than trusting anything the client asserted.
 *
 * There is deliberately no `ask` tool: exposing `search_paper` + `verify_claim`
 * and letting Claude reason is both better MCP design and the better story --
 * we supply ground truth, Claude supplies inference.
 */

/** MCP wants text content; JSON keeps it parseable on the model's side. */
function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorText(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "list_papers",
    {
      title: "List papers",
      description: "List the papers in a workspace with id, title, authors, year, and archetype.",
      inputSchema: { workspace_id: z.string().describe("Workspace id, e.g. ws-1") },
    },
    async ({ workspace_id }) => {
      const workspace = await fetchWorkspace(workspace_id);
      return json(
        workspace.papers.map((p) => ({
          paper_id: p.id,
          title: p.title,
          authors: p.authors,
          year: p.year,
          archetype: p.archetype,
        })),
      );
    },
  );

  server.registerTool(
    "search_paper",
    {
      title: "Search paper text",
      description:
        "Find chunks of paper text matching a query. Returns each chunk's stable citation id (e.g. C7), " +
        "its page, and its verbatim text. Cite the returned ids -- never invent one.",
      inputSchema: {
        workspace_id: z.string(),
        query: z.string(),
        paper_id: z.string().optional().describe("Restrict to one paper"),
        k: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ workspace_id, query, paper_id, k }) => {
      const hits = await searchPaper({ workspaceId: workspace_id, query, paperId: paper_id, k });
      if (hits.length === 0) {
        return json({ hits: [], note: "No chunk in this workspace matched those terms." });
      }
      return json({
        hits: hits.map((h) => ({
          ref_id: h.refId,
          paper_id: h.paperId,
          page: h.page,
          quote: h.text,
          citation_line: h.line,
          score: Number(h.score.toFixed(3)),
        })),
      });
    },
  );

  server.registerTool(
    "verify_claim",
    {
      title: "Verify a claim against the source",
      description:
        "Deterministically check whether a quote actually appears in a cited chunk. Returns one of " +
        "quote_located / paraphrase / unsupported, the match score, page, and the numeric-entailment " +
        "result. This is a fuzzy-match over the real source text -- it proves quotation provenance, " +
        "not that the claim follows from the quote.",
      inputSchema: {
        workspace_id: z.string(),
        ref_id: z.string().describe("Stable citation id from search_paper, e.g. C7"),
        quote: z.string().describe("The quote to check, as close to verbatim as possible"),
        claim: z.string().optional().describe("The claim the quote is being used to support"),
      },
    },
    async ({ workspace_id, ref_id, quote, claim }) => {
      const workspace = await fetchWorkspace(workspace_id);
      const [result] = verifyClaimsAgainstCorpus({
        chunks: workspace.chunks,
        numerics: workspace.numerics,
        claims: [{ nodeId: "mcp-verify", refId: ref_id.split("|")[0]!.trim(), quote }],
      });

      if (!result) return errorText("Verification produced no result.");

      const chunk = result.evidence.anchor
        ? workspace.chunks.find((c) => c.id === result.evidence.anchor!.chunkId)
        : undefined;

      return json({
        claim: claim ?? null,
        ref_id: result.evidence.refId,
        tier: result.evidence.tier,
        match_score: Number(result.evidence.matchScore.toFixed(3)),
        numeric_ok: result.evidence.numericOk,
        hallucinated_ref: result.hallucinatedRef,
        page: chunk?.page ?? null,
        located_quote: result.evidence.anchor?.quote ?? null,
        spans: result.evidence.anchor?.spans ?? null,
        deep_link: nodeDeepLink(workspace_id, "mcp-verify"),
        note:
          result.evidence.tier === "unsupported"
            ? "The anchor was dropped: this quote does not match the cited source closely enough, or its numbers do not check out."
            : "quote located means the quote was found in the source. It does not mean the claim follows from it.",
      });
    },
  );

  server.registerTool(
    "get_outline",
    {
      title: "Get workspace outline",
      description:
        "Compact text tree of the workspace: papers, their pillars, leaf titles, and evidence counts.",
      inputSchema: { workspace_id: z.string() },
    },
    async ({ workspace_id }) => {
      const outline = await getOutline(workspace_id);
      return json({ text: outline.text, papers: outline.papers, cross_paper: outline.crossPaper });
    },
  );

  server.registerTool(
    "get_node",
    {
      title: "Get a node",
      description:
        "Fetch one node's body with its anchors resolved inline to quote, page, and deep link.",
      inputSchema: { workspace_id: z.string(), node_id: z.string() },
    },
    async ({ workspace_id, node_id }) => {
      const node = await getNode(workspace_id, node_id);
      if (!node) return errorText(`No node ${node_id} in workspace ${workspace_id}.`);
      return json(node);
    },
  );

  server.registerTool(
    "create_node",
    {
      title: "Create a node",
      description:
        "Write a claim into the graph. Submitted evidence is ALWAYS re-verified server-side against " +
        "the source: any quote that fails the fuzzy match or the numeric floor has its anchor dropped " +
        "and the node is marked low-confidence. You cannot assert that a quote is located.",
      inputSchema: {
        workspace_id: z.string(),
        parent_id: z.string().optional(),
        title: z.string(),
        body_md: z.string().describe("Markdown body; mark each claim with [^n0], [^n1], ... in order"),
        evidence: z
          .array(
            z.object({
              refs: z.array(z.string()).min(1).describe("Stable citation ids, e.g. [\"C4\", \"C5\"]"),
              quote: z.string().describe("Verbatim quote from the cited source"),
            }),
          )
          .describe("One entry per [^nN] marker in body_md, in the same order"),
      },
    },
    async ({ workspace_id, parent_id, title, body_md, evidence }) => {
      try {
        const result = await createNode({
          workspaceId: workspace_id,
          parentId: parent_id,
          title,
          bodyMd: body_md,
          claims: evidence,
        });
        return json({
          node_id: result.nodeId,
          deep_link: result.deepLink,
          low_confidence: result.lowConfidence,
          dropped_refs: result.droppedRefs,
          evidence: result.evidence.map((e) => ({
            evidence_id: e.id,
            ref_id: e.refId,
            tier: e.tier,
            match_score: Number(e.matchScore.toFixed(3)),
            numeric_ok: e.numericOk,
            quote: e.anchor?.quote ?? null,
          })),
          note: result.lowConfidence
            ? "Node created, but at least one claim failed verification and its anchor was dropped."
            : "Node created; every submitted claim verified against the source.",
        });
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "find_contradictions",
    {
      title: "Find contradictions",
      description:
        "Find claim pairs in this workspace that contradict each other. Only pairs where BOTH sides " +
        "have a located quote are returned -- a one-sided contradiction is not evidence.",
      inputSchema: { workspace_id: z.string(), concept: z.string().optional() },
    },
    async ({ workspace_id, concept }) => {
      const pairs = await findContradictions(workspace_id, concept);
      if (pairs.length === 0) {
        return json({
          pairs: [],
          note: concept
            ? `No two-sided contradictions mentioning "${concept}".`
            : "No two-sided contradictions in this workspace.",
        });
      }
      return json({ pairs });
    },
  );

  server.registerTool(
    "paper_facts",
    {
      title: "Get paper facts",
      description:
        "Structured facts about one paper: numeric_ledger (every extracted statistic with its N-ref) " +
        "or coverage (how much of the paper's text is actually anchored by evidence).",
      inputSchema: {
        workspace_id: z.string(),
        paper_id: z.string(),
        kind: z.enum(["numeric_ledger", "coverage"]),
      },
    },
    async ({ workspace_id, paper_id, kind }) => {
      if (kind === "numeric_ledger") {
        return json({ kind, numerics: await paperNumericLedger(workspace_id, paper_id) });
      }
      return json({ kind, ...(await paperCoverage(workspace_id, paper_id)) });
    },
  );
}
