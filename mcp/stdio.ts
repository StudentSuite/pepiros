#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server";
import { resolveMcpToken } from "@/lib/services/mcpTokens";
import { checkToken } from "@/lib/services/mcpAuth";

/**
 * stdio entry point (docs/PLAN-V1.md §13.4) -- `npm run mcp:stdio`, or wired
 * into Claude Code / Desktop as a command. This is the primary demo path;
 * §17's risk note says assume stdio-only from the start and treat remote
 * HTTP + OAuth as the stretch.
 *
 * Nothing may be written to stdout except protocol frames: stdout *is* the
 * transport. Any diagnostic goes to stderr, or it corrupts the JSON-RPC
 * stream and the client disconnects with a parse error.
 *
 * WHY `mcp:stdio` RUNS WITH `--conditions=react-server`. Several of the
 * lib/services/* modules the tool layer calls (jobs.ts, ingest.ts,
 * ingestStore.ts, share.ts) start with `import "server-only"`, which is
 * correct inside the Next.js app -- it fails the build if one of those ever
 * gets pulled into a client bundle. But this file runs under plain
 * tsx/Node, with no bundler to resolve that package's "react-server" export
 * condition to its no-op build; unconditionally it throws
 * "This module cannot be imported from a Client Component module." The
 * `--conditions=react-server` flag makes Node pick that same no-op branch,
 * so this process gets the real service-layer code with the guard satisfied
 * rather than needing a second, server-only-free copy of any of it.
 */
/**
 * `PEPIROS_MCP_TOKEN`, when set, gates this session: a config like
 * `{"env": {"PEPIROS_MCP_TOKEN": "pep_..."}}` in a Claude Desktop/Codex/Cursor
 * MCP config is how a token minted in settings actually reaches the server.
 * An invalid or revoked token refuses to start rather than silently falling
 * back to unrestricted access -- that fallback is reserved for the token
 * being *absent* entirely (today's zero-setup local-dev path).
 */
async function resolveSession() {
  const raw = process.env.PEPIROS_MCP_TOKEN;
  if (!raw) return null;

  const record = await resolveMcpToken(raw);
  const check = checkToken(record);
  if (!check.ok) {
    throw new Error(
      check.reason === "revoked"
        ? "PEPIROS_MCP_TOKEN has been revoked. Mint a new one in settings."
        : "PEPIROS_MCP_TOKEN does not match any issued token.",
    );
  }
  return check.token;
}

async function main() {
  const session = await resolveSession();
  const server = createMcpServer(session);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    session
      ? `pepiros mcp: connected over stdio (token scope=${session.scope}, workspace=${session.workspaceId ?? "any"})\n`
      : "pepiros mcp: connected over stdio (no token configured, unrestricted local access)\n",
  );
}

main().catch((err) => {
  process.stderr.write(`pepiros mcp: fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
