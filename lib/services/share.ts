import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Share-link resolution (docs/PLAN-V1.md `share_tokens` table). The table
 * already exists in lib/db/schema.ts but there is no live Postgres to write
 * it to (CLAUDE.md's current data seam), so this keeps tokens in a
 * process-local map with the same shape a DB-backed version would expose --
 * same pattern as lib/services/jobs.ts.
 *
 * The previous behaviour (ShareClient always loading "ws-1" regardless of the
 * token in the URL) meant every share link opened identical content. This
 * makes resolution real: an unminted or revoked token resolves to nothing and
 * the route renders an expired state, rather than silently substituting the
 * fixture workspace.
 */

interface ShareTokenRecord {
  workspaceId: string;
  createdAt: number;
}

declare global {
  var __pepirosShareTokens: Map<string, ShareTokenRecord> | undefined;
}

function store(): Map<string, ShareTokenRecord> {
  if (!global.__pepirosShareTokens) global.__pepirosShareTokens = new Map();
  return global.__pepirosShareTokens;
}

export function createShareToken(workspaceId: string): string {
  const token = randomBytes(9).toString("base64url");
  store().set(token, { workspaceId, createdAt: Date.now() });
  return token;
}

export function resolveShareToken(token: string): { workspaceId: string } | null {
  const record = store().get(token);
  if (!record) return null;
  return { workspaceId: record.workspaceId };
}
