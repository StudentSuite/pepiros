// POST. RFC 7591 OAuth 2.0 Dynamic Client Registration -- lets a remote MCP
// client register itself with no manual setup (issue #109, docs/PLAN-V1.md
// §13.4). No auth: registration is the first step, before any credential
// exists yet, same as every other real DCR implementation.
import { NextResponse } from "next/server";
import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import { registerOAuthClient } from "@/lib/services/mcpOAuth";
import { checkRateLimit, clientIpFrom } from "@/lib/services/mcpRateLimit";

export async function POST(request: Request) {
  // Issue #222: unauthenticated by RFC 7591 design, so this had no cap at
  // all -- an anonymous caller could loop this indefinitely, inserting
  // unbounded rows into mcp_oauth_clients.
  const rate = await checkRateLimit(clientIpFrom(request), "mcp_oauth_register");
  if (!rate.ok) {
    return NextResponse.json(
      { error: "rate_limited", error_description: `Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429 },
    );
  }

  const parsed = OAuthClientMetadataSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: parsed.error.message },
      { status: 400 },
    );
  }

  if (parsed.data.redirect_uris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "At least one redirect_uris entry is required." },
      { status: 400 },
    );
  }

  const client = await registerOAuthClient({
    redirectUris: parsed.data.redirect_uris.map((u) => u.toString()),
    clientName: parsed.data.client_name ?? null,
    tokenEndpointAuthMethod: parsed.data.token_endpoint_auth_method ?? null,
  });

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_secret: client.clientSecret ?? undefined,
      client_name: client.clientName ?? undefined,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: client.clientSecret ? "client_secret_post" : "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201 },
  );
}
