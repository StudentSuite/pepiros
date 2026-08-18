// POST/GET/DELETE. The remote streamable-HTTP MCP transport (issue #109,
// docs/PLAN-V1.md §13.4) -- the same tool/resource/prompt layer stdio uses
// (mcp/server.ts's createMcpServer()), reachable over the network instead of
// a locally-spawned process, so a hosted client (claude.ai Connectors, a
// ChatGPT connector) can use it.
//
// Stateless mode (no sessionIdGenerator): each request gets its own
// server+transport pair, connected and torn down within the request. This
// is the only mode that makes sense on serverless (Vercel) -- there is no
// persistent process to hold a stateful SSE session open across requests
// that may land on different instances, the same reasoning that moved
// mcp_tokens off a local JSON file (lib/services/mcpTokens.ts).
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/server";
import { resolveMcpToken } from "@/lib/services/mcpTokens";
import { checkToken } from "@/lib/services/mcpAuth";

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Per RFC 9728 + the MCP auth spec: a request with no (or an invalid)
 * bearer token gets a 401 whose WWW-Authenticate header points at the
 * protected-resource metadata, so a client with zero prior configuration
 * can walk from "got a 401" to "here's where to register and authorize"
 * with no documentation needed.
 */
function unauthorized(detail: string): Response {
  return new Response(JSON.stringify({ error: "invalid_token", error_description: detail }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer resource_metadata="${appOrigin()}/.well-known/oauth-protected-resource"`,
    },
  });
}

async function handle(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  const token = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return unauthorized("No bearer token provided.");

  const record = await resolveMcpToken(token);
  const check = checkToken(record);
  if (!check.ok) {
    return unauthorized(check.reason === "revoked" ? "This token has been revoked." : "This token is not recognized.");
  }

  const server = createMcpServer(check.token);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
