import "server-only";
import { randomUUID } from "node:crypto";
import {
  findMcpTokenRowByHash,
  insertMcpTokenRow,
  listActiveMcpTokenRows,
  revokeMcpTokenRow,
  touchMcpTokenRow,
} from "@/lib/db/queries";
import { generateToken, hashToken, type McpScope, type McpTokenRecord } from "./mcpAuth";

/**
 * MCP token issuance/verification (docs/PLAN-V1.md §13.4), backed by the
 * real `mcp_tokens` Postgres table (issue #109).
 *
 * Used to be a gitignored JSON file under `.pepiros/` instead -- that was a
 * deliberate choice while the only consumer was mcp/stdio.ts, a separate OS
 * process on the *same machine* as the Next.js server minting the token, so
 * a shared local file was enough. Issue #109's remote streamable-HTTP
 * transport breaks that assumption: an OAuth-issued token has to be
 * verifiable by whichever serverless instance handles the next tool call,
 * which may not be the instance (or even the same physical machine) that
 * minted it. Real Postgres is the one thing both definitely share.
 *
 * Only `hashToken()`'s output is ever persisted; the raw token is returned
 * once, at creation, and never again (see mcpAuth.ts's own doc comment on
 * why SHA-256 is the right primitive here).
 */

export interface McpTokenMeta {
  id: string;
  label: string;
  scope: McpScope;
  workspaceId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Issue #150: `profileId` is now required at mint time -- this table
 * shipped with no owner column at all, so every token was visible to and
 * revocable by every signed-in user. `null` is only for the pre-fix
 * OAuth-token-mint path (issue #151 closes that gap too); every caller
 * below this file passes a real profile id.
 */
export async function createMcpToken(input: {
  label: string;
  scope: McpScope;
  workspaceId: string | null;
  profileId: string | null;
}): Promise<{ id: string; token: string }> {
  const token = generateToken();
  const id = randomUUID();
  await insertMcpTokenRow({
    id,
    tokenHash: hashToken(token),
    scope: input.scope,
    workspaceId: input.workspaceId,
    label: input.label,
    profileId: input.profileId,
  });
  return { id, token };
}

/** Metadata only -- never the hash, and never revoked tokens (they're gone, not just marked). Scoped to `profileId` (issue #150). */
export async function listMcpTokens(profileId: string): Promise<McpTokenMeta[]> {
  const rows = await listActiveMcpTokenRows(profileId);
  return rows.map((row) => ({
    id: row.id,
    label: row.label ?? "Untitled token",
    scope: row.scope,
    workspaceId: row.workspaceId,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }));
}

/** Issue #150: only revokes a token owned by `profileId`. */
export async function revokeMcpToken(id: string, profileId: string): Promise<boolean> {
  return revokeMcpTokenRow(id, profileId);
}

/**
 * Resolves a raw token (e.g. from the `PEPIROS_MCP_TOKEN` env var an MCP
 * client is configured with, or a Bearer header on the remote transport) to
 * its record via a hash lookup, and marks it used. Returns undefined for an
 * unknown token -- lib/services/mcpAuth.ts's checkToken() turns that into
 * the actual not_found/revoked decision.
 */
export async function resolveMcpToken(rawToken: string): Promise<McpTokenRecord | undefined> {
  const row = await findMcpTokenRowByHash(hashToken(rawToken));
  if (!row) return undefined;

  await touchMcpTokenRow(row.id);

  return {
    id: row.id,
    scope: row.scope,
    workspaceId: row.workspaceId,
    revokedAt: row.revokedAt,
    profileId: row.profileId,
  };
}
