import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";
import { checkToken } from "./mcpAuth";
import { createMcpToken, listMcpTokens, resolveMcpToken, revokeMcpToken } from "./mcpTokens";

/**
 * Real Postgres now (issue #109) -- a throwaway workspace row of this
 * suite's own, not the shared "ws-1" fixture id, so a token pinned to a
 * workspace satisfies the real FK without colliding with any other test's
 * use of "ws-1" (e.g. synthesis.test.ts). Deleted in afterAll, which
 * cascades to every mcp_tokens row this suite minted against it.
 */
const TEST_WORKSPACE_ID = `mcp-tokens-test-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  await db.insert(workspaces).values({ id: TEST_WORKSPACE_ID, name: "mcpTokens test workspace" });
});

afterAll(async () => {
  await db.delete(workspaces).where(eq(workspaces.id, TEST_WORKSPACE_ID));
});

describe("mcpTokens", () => {
  it("mints a token whose raw value resolves back to its own record", async () => {
    const { id, token } = await createMcpToken({ label: "Test", scope: "write", workspaceId: TEST_WORKSPACE_ID });

    const record = await resolveMcpToken(token);
    expect(record).toBeDefined();
    expect(record!.id).toBe(id);
    expect(record!.scope).toBe("write");
    expect(record!.workspaceId).toBe(TEST_WORKSPACE_ID);
    expect(checkToken(record).ok).toBe(true);
  });

  it("never exposes the raw token or its hash from listMcpTokens", async () => {
    await createMcpToken({ label: "List me", scope: "read", workspaceId: null });
    const tokens = await listMcpTokens();
    for (const t of tokens) {
      expect(t).not.toHaveProperty("tokenHash");
      expect(t).not.toHaveProperty("token");
    }
  });

  it("does not resolve an unknown token", async () => {
    expect(await resolveMcpToken("pep_totally-made-up")).toBeUndefined();
  });

  it("stops resolving a token once revoked, and drops it from the list", async () => {
    const { id, token } = await createMcpToken({ label: "Revoke me", scope: "read", workspaceId: null });
    expect((await listMcpTokens()).some((t) => t.id === id)).toBe(true);

    const revoked = await revokeMcpToken(id);
    expect(revoked).toBe(true);

    expect((await listMcpTokens()).some((t) => t.id === id)).toBe(false);
    // resolveMcpToken still finds the record (it's a real, minted token) --
    // checkToken() is what turns "revoked" into a rejection, same contract
    // as an unrevoked token: resolution and authorization are separate steps.
    const record = await resolveMcpToken(token);
    expect(record).toBeDefined();
    expect(checkToken(record)).toEqual({ ok: false, reason: "revoked" });
  });

  it("revoking an already-revoked or unknown id is a no-op, not a throw", async () => {
    expect(await revokeMcpToken("no-such-id")).toBe(false);
  });
});
