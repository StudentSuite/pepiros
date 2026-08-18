// GET. RFC 9728 OAuth 2.0 Protected Resource Metadata -- a client that hits
// POST /api/mcp without a token gets a 401 whose WWW-Authenticate header
// points here (app/api/mcp/route.ts), and this in turn points at the
// authorization server metadata, so the whole discovery chain is walkable
// from one failed request with no prior configuration (issue #109).
import { NextResponse } from "next/server";

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET() {
  const origin = appOrigin();

  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ["read", "write"],
    bearer_methods_supported: ["header"],
  });
}
