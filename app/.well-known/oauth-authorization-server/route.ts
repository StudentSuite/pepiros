// GET. RFC 8414 OAuth 2.0 Authorization Server Metadata -- the first thing a
// remote MCP client (claude.ai Connectors, a ChatGPT connector) fetches to
// discover how to register and authenticate against this server (issue #109,
// docs/PLAN-V1.md §13.4). No auth of its own; this is public discovery data.
import { NextResponse } from "next/server";

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET() {
  const origin = appOrigin();

  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    scopes_supported: ["read", "write"],
  });
}
