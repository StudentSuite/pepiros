import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  findMcpOAuthClient,
  findMcpOAuthCodeByHash,
  insertMcpOAuthClient,
  insertMcpOAuthCode,
  markMcpOAuthCodeUsed,
  type McpOAuthClientRow,
} from "@/lib/db/queries";
import { createMcpToken } from "./mcpTokens";
import type { McpScope } from "./mcpAuth";

/**
 * OAuth 2.1 + RFC 7591 Dynamic Client Registration for the remote
 * streamable-HTTP transport (issue #109, docs/PLAN-V1.md §13.4). This is
 * the OAuth-specific logic (client registration, PKCE, the authorization
 * code exchange); the actual issued credential is a real `mcp_tokens` row
 * (lib/services/mcpTokens.ts), so every §13.4 security requirement already
 * built for that (hashed storage, scopes, workspace pin, revocation) just
 * applies -- OAuth here is a second, programmatic way to mint one of those,
 * not a parallel credential system.
 *
 * A short-lived authorization code (60s) is the only new secret this file
 * introduces, and it is single-use (lib/db/queries's markMcpOAuthCodeUsed
 * only succeeds once) and hashed at rest like every other bearer secret
 * here -- the same reasoning as mcpAuth.ts's tokenHash.
 */

const CODE_TTL_MS = 60_000;

function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function timingSafeStringsEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface RegisterClientInput {
  redirectUris: string[];
  clientName: string | null;
  /** RFC 7591's `token_endpoint_auth_method` -- "none" (the PKCE-only public-client case claude.ai/ChatGPT-style connectors use) gets no secret. */
  tokenEndpointAuthMethod: string | null;
}

export interface RegisteredClient {
  clientId: string;
  /** Returned once, at registration, and never again -- null for a public client. */
  clientSecret: string | null;
  clientName: string | null;
  redirectUris: string[];
}

export async function registerOAuthClient(input: RegisterClientInput): Promise<RegisteredClient> {
  const clientId = generateId("mcpclient");
  const isPublic = !input.tokenEndpointAuthMethod || input.tokenEndpointAuthMethod === "none";
  const clientSecret = isPublic ? null : generateId("secret");

  await insertMcpOAuthClient({
    clientId,
    clientSecretHash: clientSecret ? hashSecret(clientSecret) : null,
    clientName: input.clientName,
    redirectUris: input.redirectUris,
  });

  return { clientId, clientSecret, clientName: input.clientName, redirectUris: input.redirectUris };
}

export async function getOAuthClient(clientId: string): Promise<McpOAuthClientRow | undefined> {
  return findMcpOAuthClient(clientId);
}

/** A public client (no stored secret) always passes -- PKCE is its actual proof of possession. */
export function clientSecretMatches(client: McpOAuthClientRow, providedSecret: string | undefined): boolean {
  if (!client.clientSecretHash) return true;
  if (!providedSecret) return false;
  return timingSafeStringsEqual(client.clientSecretHash, hashSecret(providedSecret));
}

export interface IssueCodeInput {
  clientId: string;
  profileId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: McpScope;
  workspaceId: string | null;
}

export async function issueAuthorizationCode(input: IssueCodeInput): Promise<string> {
  const code = generateId("mcpcode");
  await insertMcpOAuthCode({
    id: randomUUID(),
    codeHash: hashSecret(code),
    clientId: input.clientId,
    profileId: input.profileId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    scope: input.scope,
    workspaceId: input.workspaceId,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

/** RFC 7636 S256: BASE64URL(SHA256(code_verifier)) === code_challenge. */
function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
  return timingSafeStringsEqual(computed, codeChallenge);
}

export type ExchangeCodeResult =
  | { ok: true; accessToken: string; scope: McpScope }
  | { ok: false; error: "invalid_grant" };

/**
 * The one place a code becomes a real token. Every OAuth 2.1-mandated check
 * runs here, in this order, so a caller can't skip one by hitting the route
 * a different way: client match, redirect_uri match (binds the code to the
 * exact flow that requested it), not already used, not expired, PKCE
 * verifies. `markMcpOAuthCodeUsed`'s DB-level single-use guarantee is what
 * actually stops a replayed code from minting two tokens, not just this
 * function's own `usedAt` read -- two concurrent redemption attempts race
 * on that update, and only one wins.
 */
export async function exchangeAuthorizationCode(input: {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientName: string | null;
}): Promise<ExchangeCodeResult> {
  const row = await findMcpOAuthCodeByHash(hashSecret(input.code));
  if (!row) return { ok: false, error: "invalid_grant" };
  if (row.clientId !== input.clientId) return { ok: false, error: "invalid_grant" };
  if (row.redirectUri !== input.redirectUri) return { ok: false, error: "invalid_grant" };
  if (row.usedAt) return { ok: false, error: "invalid_grant" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "invalid_grant" };
  if (!verifyPkce(input.codeVerifier, row.codeChallenge)) return { ok: false, error: "invalid_grant" };

  const claimed = await markMcpOAuthCodeUsed(row.id);
  if (!claimed) return { ok: false, error: "invalid_grant" };

  const minted = await createMcpToken({
    label: input.clientName ? `OAuth: ${input.clientName}` : "OAuth client",
    scope: row.scope,
    workspaceId: row.workspaceId,
    // Issue #151: row.profileId was already captured on the authorization
    // code (whoever approved the consent screen) but was dropped here,
    // making every OAuth-minted token just as ownerless as #150's gap.
    profileId: row.profileId,
  });

  return { ok: true, accessToken: minted.token, scope: row.scope };
}
