// POST. OAuth 2.1 token endpoint -- exchanges the authorization code
// /oauth/authorize issued (plus its PKCE code_verifier) for a real access
// token (issue #109, docs/PLAN-V1.md §13.4). Body is
// application/x-www-form-urlencoded per RFC 6749, not JSON, the same as
// every real OAuth token endpoint.
import { NextResponse } from "next/server";
import { clientSecretMatches, exchangeAuthorizationCode, getOAuthClient } from "@/lib/services/mcpOAuth";
import { checkRateLimit, clientIpFrom } from "@/lib/services/mcpRateLimit";

function errorResponse(error: string, description: string, status: number) {
  return NextResponse.json({ error, error_description: description }, { status });
}

export async function POST(request: Request) {
  // Issue #222: this had no cap at all -- a caller could hammer this route
  // with code/client_secret guesses with zero backoff.
  const rate = await checkRateLimit(clientIpFrom(request), "mcp_oauth_token");
  if (!rate.ok) {
    return errorResponse("rate_limited", `Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.`, 429);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return errorResponse("invalid_request", "Expected application/x-www-form-urlencoded.", 400);
  }

  const body = new URLSearchParams(await request.text());
  const grantType = body.get("grant_type");
  if (grantType !== "authorization_code") {
    return errorResponse("unsupported_grant_type", 'Only "authorization_code" is supported.', 400);
  }

  const code = body.get("code");
  const redirectUri = body.get("redirect_uri");
  const codeVerifier = body.get("code_verifier");
  const clientId = body.get("client_id");
  const clientSecret = body.get("client_secret") ?? undefined;

  if (!code || !redirectUri || !codeVerifier || !clientId) {
    return errorResponse("invalid_request", "code, redirect_uri, code_verifier, and client_id are all required.", 400);
  }

  const client = await getOAuthClient(clientId);
  if (!client || !clientSecretMatches(client, clientSecret)) {
    return errorResponse("invalid_client", "Unknown client, or client_secret did not match.", 401);
  }

  const result = await exchangeAuthorizationCode({
    clientId,
    code,
    codeVerifier,
    redirectUri,
    clientName: client.clientName,
  });

  if (!result.ok) {
    return errorResponse(result.error, "The authorization code is invalid, expired, already used, or failed PKCE verification.", 400);
  }

  return NextResponse.json({
    access_token: result.accessToken,
    token_type: "bearer",
    scope: result.scope,
  });
}
