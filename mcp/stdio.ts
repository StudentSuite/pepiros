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
