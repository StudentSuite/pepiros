import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateToken, hashToken, hashesMatch, type McpScope, type McpTokenRecord } from "./mcpAuth";

/**
 * MCP token issuance/verification (docs/PLAN-V1.md §13.4). The `mcp_tokens`
 * table exists in lib/db/schema.ts but there is no live Postgres to write it
 * to yet (CLAUDE.md's current data seam).
 *
 * WHY THIS IS A FILE, NOT AN IN-MEMORY MAP LIKE jobs.ts/share.ts/
 * ingestStore.ts. Those all read and write from *inside* the same Next.js
 * server process. A token minted in Settings has to be verifiable by
 * mcp/stdio.ts, which is a *separate OS process* (spawned by Claude Desktop,
 * `npm run mcp:stdio`, or the built `pepiros-mcp` binary) with its own
 * memory -- an in-memory store here would make every freshly minted token
 * invisible to the process that is supposed to check it. A small JSON file
 * under `.pepiros/` (gitignored, created on first use) is the cheapest thing
 * both processes can agree on without standing up a database.
 *
 * Only `hashToken()`'s output is ever persisted; the raw token is returned
 * once, at creation, and never again (see mcpAuth.ts's own doc comment on
 * why SHA-256 is the right primitive here).
 */

/** Overridable so tests can point this at a throwaway file instead of the real project directory. */
function storePath(): string {
  return process.env.PEPIROS_MCP_TOKENS_PATH ?? path.join(process.cwd(), ".pepiros", "mcp-tokens.json");
}

export interface McpTokenMeta {
  id: string;
  label: string;
  scope: McpScope;
  workspaceId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface StoredToken extends McpTokenMeta {
  tokenHash: string;
  revokedAt: string | null;
}

function readAll(): StoredToken[] {
  const file = storePath();
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoredToken[];
  } catch {
    // A corrupt or hand-edited file is a bad day, not a crash -- treat it as
    // no tokens rather than taking down every tool call.
    return [];
  }
}

function writeAll(tokens: StoredToken[]): void {
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(tokens, null, 2));
}

export function createMcpToken(input: {
  label: string;
  scope: McpScope;
  workspaceId: string | null;
}): { id: string; token: string } {
  const token = generateToken();
  const id = randomUUID();
  const tokens = readAll();
  tokens.push({
    id,
    label: input.label,
    scope: input.scope,
    workspaceId: input.workspaceId,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
    tokenHash: hashToken(token),
  });
  writeAll(tokens);
  return { id, token };
}

/** Metadata only -- never the hash, and never revoked tokens (they're gone, not just marked). */
export function listMcpTokens(): McpTokenMeta[] {
  return readAll()
    .filter((t) => !t.revokedAt)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(({ tokenHash: _tokenHash, revokedAt: _revokedAt, ...meta }) => meta);
}

export function revokeMcpToken(id: string): boolean {
  const tokens = readAll();
  const record = tokens.find((t) => t.id === id);
  if (!record || record.revokedAt) return false;
  record.revokedAt = new Date().toISOString();
  writeAll(tokens);
  return true;
}

/**
 * Resolves a raw token (e.g. from the `PEPIROS_MCP_TOKEN` env var an MCP
 * client is configured with) to its record via a constant-time hash
 * compare, and marks it used. Returns undefined for an unknown token --
 * lib/services/mcpAuth.ts's checkToken() turns that into the actual
 * not_found/revoked decision.
 */
export function resolveMcpToken(rawToken: string): McpTokenRecord | undefined {
  const hash = hashToken(rawToken);
  const tokens = readAll();
  const stored = tokens.find((t) => hashesMatch(t.tokenHash, hash));
  if (!stored) return undefined;

  stored.lastUsedAt = new Date().toISOString();
  writeAll(tokens);

  return {
    id: stored.id,
    scope: stored.scope,
    workspaceId: stored.workspaceId,
    revokedAt: stored.revokedAt ? new Date(stored.revokedAt) : null,
  };
}
