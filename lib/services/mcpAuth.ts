import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token minting/verification for the MCP surface (docs/PLAN-V1.md §13.4).
 *
 * SHA-256 rather than a slow KDF (bcrypt/argon2) is deliberate and is the
 * right call *only* because of how these tokens are generated: 256 bits from
 * a CSPRNG. A slow KDF buys resistance to offline guessing of low-entropy
 * secrets; there is nothing to guess here, and MCP verifies a token on every
 * tool call, where a deliberately slow hash would be a real latency cost.
 * If these ever become user-chosen strings, this must change to argon2id.
 */

const TOKEN_BYTES = 32;
const TOKEN_PREFIX = "pep_";

export type McpScope = "read" | "write";

export function generateToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("hex")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Constant-time compare of two hex hashes. Both are the same fixed length by
 * construction, but length is still checked first because timingSafeEqual
 * throws on a length mismatch rather than returning false.
 */
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface McpTokenRecord {
  id: string;
  scope: McpScope;
  workspaceId: string | null;
  revokedAt: Date | null;
}

export type TokenCheck =
  | { ok: true; token: McpTokenRecord }
  | { ok: false; reason: "not_found" | "revoked" };

/**
 * Pure authorization decision, kept separate from the DB read so it is
 * testable without a live Postgres (CLAUDE.md's current data seam: there
 * isn't one yet).
 */
export function checkToken(record: McpTokenRecord | undefined): TokenCheck {
  if (!record) return { ok: false, reason: "not_found" };
  if (record.revokedAt !== null) return { ok: false, reason: "revoked" };
  return { ok: true, token: record };
}

/** `create_node`/`add_paper` require `write`; everything else is fine on `read`. */
export function hasScope(record: McpTokenRecord, required: McpScope): boolean {
  return required === "read" ? true : record.scope === "write";
}

/**
 * A token pinned to one workspace may only reach that workspace; an unpinned
 * token (`workspaceId === null`) may reach any. Called by every tool that
 * takes a workspace id -- a scope check alone would not stop a pinned token
 * from reading a neighbouring workspace.
 */
export function canAccessWorkspace(record: McpTokenRecord, workspaceId: string): boolean {
  return record.workspaceId === null || record.workspaceId === workspaceId;
}
