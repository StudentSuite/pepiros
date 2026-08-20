import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWorkspaceData } from "@/lib/services/workspace";
import { getOutline, resolveNodeFromWorkspace } from "@/lib/services/nodes";
import { canAccessWorkspace, type McpTokenRecord } from "@/lib/services/mcpAuth";
import { checkRateLimit } from "@/lib/services/mcpRateLimit";

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

function accessDenied(uri: { href: string }, workspaceId: string) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: `This MCP token is pinned to a different workspace and cannot reach "${workspaceId}".`,
      },
    ],
  };
}

function rateLimitDenied(uri: { href: string }, retryAfterMs: number) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: `Rate limit exceeded for this resource on this token. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
      },
    ],
  };
}

/**
 * Issue #207: resource reads had no analogue of registerTools()'s
 * authorize()-driven checkRateLimit -- only the access-pin check ran, so a
 * client could `@`-mention/fetch a resource an unlimited number of times per
 * minute. `resourceName` doubles as the rate-limit bucket key, same as a
 * tool name does in mcp/tools/index.ts.
 */
async function rateLimited(session: McpTokenRecord | null | undefined, resourceName: string) {
  if (!session) return null;
  const rate = await checkRateLimit(session.id, resourceName);
  return rate.ok ? null : rate.retryAfterMs;
}

/**
 * MCP resources (docs/PLAN-V1.md §13.3), so a user can `@`-mention a paper or
 * node in Claude rather than describing it.
 *
 * Scheme is `pepiros://`. §13.3 says `researchsumm://`, which predates the
 * project rename -- the package, repo, and every other identifier say
 * pepiros, so the doc is the stale one here.
 *
 * Issue #168: `session` used to not be threaded in here at all --
 * mcp/server.ts's createMcpServer() passes it to registerTools() but never
 * to registerResources(), so a token pinned to workspace A could request
 * `pepiros://workspace/{workspaceB}/outline` (or any paper/node resource)
 * and get workspace B's content served with zero authorization check, the
 * exact IDOR class already fixed for tools (canAccessWorkspace, used by
 * every tool's `authorize()`). `undefined`/`null` (no token configured)
 * still means unrestricted local-dev access, same as the tool layer.
 */
export function registerResources(server: McpServer, session?: McpTokenRecord | null): void {
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
      const retryAfterMs = await rateLimited(session, "workspace-outline");
      if (retryAfterMs !== null) return rateLimitDenied(uri, retryAfterMs);
      if (session && !canAccessWorkspace(session, id)) return accessDenied(uri, id);
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
      const retryAfterMs = await rateLimited(session, "paper");
      if (retryAfterMs !== null) return rateLimitDenied(uri, retryAfterMs);
      // fetchWorkspaceData ignores its argument while fixture-backed
      // (CLAUDE.md's data seam), so a paper is reachable without knowing its
      // workspace. Once that resolves to a real read this needs a workspace
      // id in the URI. Issue #208: this used to be the layout-computing
      // fetchWorkspace -- nothing here reads node.x/node.y.
      const workspace = await fetchWorkspaceData("");
      if (session && !canAccessWorkspace(session, workspace.id)) return accessDenied(uri, workspace.id);
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
      const retryAfterMs = await rateLimited(session, "node");
      if (retryAfterMs !== null) return rateLimitDenied(uri, retryAfterMs);
      // Issue #181: resolved from the one fetchWorkspaceData() call below
      // instead of getNode(), which would fetch (and lay out) the whole
      // workspace a second time just to look up an id already in hand.
      // Issue #208: fetchWorkspaceData, not the layout-computing
      // fetchWorkspace -- nothing here reads node.x/node.y either.
      const workspace = await fetchWorkspaceData("");
      if (session && !canAccessWorkspace(session, workspace.id)) return accessDenied(uri, workspace.id);
      const node = resolveNodeFromWorkspace(workspace, id);
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
