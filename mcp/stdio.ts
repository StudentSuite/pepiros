#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server";

/**
 * stdio entry point (docs/PLAN-V1.md §13.4) -- `npm run mcp:stdio`, or wired
 * into Claude Code / Desktop as a command. This is the primary demo path;
 * §17's risk note says assume stdio-only from the start and treat remote
 * HTTP + OAuth as the stretch.
 *
 * Nothing may be written to stdout except protocol frames: stdout *is* the
 * transport. Any diagnostic goes to stderr, or it corrupts the JSON-RPC
 * stream and the client disconnects with a parse error.
 */
async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("pepiros mcp: connected over stdio\n");
}

main().catch((err) => {
  process.stderr.write(`pepiros mcp: fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
