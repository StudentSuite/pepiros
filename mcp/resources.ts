import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWorkspace } from "@/lib/services/workspace";
import { getNode, getOutline } from "@/lib/services/nodes";

/**
 * A URI template variable arrives as `string | string[]` depending on whether
 * the template segment repeats, and the SDK's types allow undefined. All three
 * collapse to one id here.
 */
function firstValue(value: string | string[] | undefined, label: string): string {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) throw new Error(`resource URI is missing ${label}`);
  return resolved;
}

/**
 * MCP resources (docs/PLAN-V1.md §13.3), so a user can `@`-mention a paper or
 * node in Claude rather than describing it.
 *
 * Scheme is `pepiros://`. §13.3 says `researchsumm://`, which predates the
 * project rename -- the package, repo, and every other identifier say
 * pepiros, so the doc is the stale one here.
 */
export function registerResources(server: McpServer): void {
  server.registerResource(
    "workspace-outline",
    new ResourceTemplate("pepiros://workspace/{workspaceId}/outline", { list: undefined }),
    {
      title: "Workspace outline",
      description: "Papers, pillars, and leaf titles for a workspace, as a compact text tree.",
      mimeType: "text/plain",
    },
    async (uri, { workspaceId }) => {
      const id = firstValue(workspaceId, "workspaceId");
      const outline = await getOutline(id);
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text: outline.text }] };
    },
  );

  server.registerResource(
    "paper",
    new ResourceTemplate("pepiros://paper/{paperId}", { list: undefined }),
    {
      title: "Paper",
      description: "A paper's metadata and full chunked text with stable citation ids.",
      mimeType: "text/plain",
    },
    async (uri, { paperId }) => {
      const id = firstValue(paperId, "paperId");
      // fetchWorkspace ignores its argument while fixture-backed (CLAUDE.md's
      // data seam), so a paper is reachable without knowing its workspace.
      // Once that resolves to a real read this needs a workspace id in the URI.
      const workspace = await fetchWorkspace("");
      const paper = workspace.papers.find((p) => p.id === id);
      if (!paper) {
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: `No paper ${id}.` }] };
      }

      const chunks = workspace.chunks
        .filter((c) => c.paperId === id)
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((c) => `[C${c.ordinal} | p.${c.page}] ${c.text}`);

      const header = [
        paper.title,
        paper.authors.join(", "),
        paper.year ? String(paper.year) : "",
        paper.archetype ?? "",
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        contents: [
          { uri: uri.href, mimeType: "text/plain", text: [header, "", ...chunks].join("\n") },
        ],
      };
    },
  );

  server.registerResource(
    "node",
    new ResourceTemplate("pepiros://node/{nodeId}", { list: undefined }),
    {
      title: "Graph node",
      description: "One node's body with its evidence resolved to quotes and pages.",
      mimeType: "text/plain",
    },
    async (uri, { nodeId }) => {
      const id = firstValue(nodeId, "nodeId");
      const workspace = await fetchWorkspace("");
      const node = await getNode(workspace.id, id);
      if (!node) {
        return { contents: [{ uri: uri.href, mimeType: "text/plain", text: `No node ${id}.` }] };
      }

      const lines = [
        node.title,
        "",
        node.bodyMd,
        "",
        "Evidence:",
        ...node.evidence.map(
          (e) =>
            `  ${e.refId} [${e.tier}${e.page !== null ? `, p.${e.page}` : ""}] ${e.quote ?? "(anchor dropped)"}`,
        ),
        "",
        node.deepLink,
      ];

      return { contents: [{ uri: uri.href, mimeType: "text/plain", text: lines.join("\n") }] };
    },
  );
}
