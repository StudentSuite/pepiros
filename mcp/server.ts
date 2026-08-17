import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools";
import { registerResources } from "./resources";
import { registerPrompts } from "./prompts";
import type { McpTokenRecord } from "@/lib/services/mcpAuth";

/**
 * Pepiros MCP server (docs/PLAN-V1.md §13). Assembly only: every tool calls
 * `lib/services/*`, the same layer `app/api/*` calls, so the HTTP and MCP
 * surfaces re-verify through one path (§13.1).
 *
 * Transport lives in the entry points, not here, so the same server instance
 * can be served over stdio (`mcp/stdio.ts`, the demo path per §17's risk
 * note) or a remote streamable-HTTP transport later without touching the tool
 * layer. §13.4 says verify the connector/transport requirements against
 * Anthropic's current docs before building the remote path -- they move.
 */

export const SERVER_NAME = "pepiros";
export const SERVER_VERSION = "0.1.0";

/**
 * `session` is the already-resolved+checked token record for this
 * connection (mcp/stdio.ts resolves `PEPIROS_MCP_TOKEN` before calling this),
 * or `null`/omitted for unrestricted local-dev access. Threaded straight
 * through to registerTools(), which is where the actual scope/workspace
 * gating happens.
 *
 * Issue #79: that "no token = unrestricted" fallback used to trigger on the
 * mere absence of a token, full stop -- fine for stdio today (a subprocess
 * pipe, never reachable over a network at all, so "unrestricted" there is
 * no different from the caller already having a shell on the machine), but
 * a landmine for the remote streamable-HTTP transport this file's own doc
 * comment says is coming later: adding that transport by just calling this
 * same function would silently inherit "no token = wide open to anyone who
 * connects" as its default. Checked once, here, in the one function every
 * transport (present and future) goes through, rather than trusting each
 * new entry point to remember to reimplement the guard itself. NODE_ENV is
 * unset for today's `npm run mcp:stdio` (bare tsx, no NODE_ENV set), so
 * local dev is untouched; a hypothetical production-configured process is
 * the only thing this refuses.
 */
export function createMcpServer(session?: McpTokenRecord | null): McpServer {
  if (!session && process.env.NODE_ENV === "production") {
    throw new Error(
      "No MCP token configured (PEPIROS_MCP_TOKEN) and NODE_ENV=production -- refusing unrestricted access. Mint a token in settings, or unset NODE_ENV for local dev use.",
    );
  }

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: [
        "Pepiros exposes research papers whose claims are bound to located quotes.",
        "",
        "Cite only the stable ids these tools hand you (C7, N12) -- never invent one.",
        "search_paper finds the text; verify_claim checks a quote against the real source.",
        "",
        'A "quote located" result means the quote was found in the source. It does NOT mean',
        "the claim follows from the quote -- that inference is yours, and it is worth stating",
        "separately. There is no tool that will judge entailment for you, by design.",
      ].join("\n"),
    },
  );

  registerTools(server, session);
  registerResources(server);
  registerPrompts(server);

  return server;
}
