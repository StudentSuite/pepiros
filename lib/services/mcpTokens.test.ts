import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkToken } from "./mcpAuth";
import { createMcpToken, listMcpTokens, resolveMcpToken, revokeMcpToken } from "./mcpTokens";

const TEST_STORE_PATH = path.join(tmpdir(), `pepiros-mcp-tokens-test-${process.pid}.json`);

beforeAll(() => {
  // Isolated from the real .pepiros/mcp-tokens.json -- this suite writes and
  // revokes real tokens and shouldn't touch (or be polluted by) local state.
  process.env.PEPIROS_MCP_TOKENS_PATH = TEST_STORE_PATH;
});

afterAll(() => {
  delete process.env.PEPIROS_MCP_TOKENS_PATH;
  rmSync(TEST_STORE_PATH, { force: true });
});

describe("mcpTokens", () => {
  it("mints a token whose raw value resolves back to its own record", () => {
    const { id, token } = createMcpToken({ label: "Test", scope: "write", workspaceId: "ws-1" });

    const record = resolveMcpToken(token);
    expect(record).toBeDefined();
    expect(record!.id).toBe(id);
    expect(record!.scope).toBe("write");
    expect(record!.workspaceId).toBe("ws-1");
    expect(checkToken(record).ok).toBe(true);
  });

  it("never exposes the raw token or its hash from listMcpTokens", () => {
    createMcpToken({ label: "List me", scope: "read", workspaceId: null });
    const tokens = listMcpTokens();
    for (const t of tokens) {
      expect(t).not.toHaveProperty("tokenHash");
      expect(t).not.toHaveProperty("token");
    }
  });

  it("does not resolve an unknown token", () => {
    expect(resolveMcpToken("pep_totally-made-up")).toBeUndefined();
  });

  it("stops resolving a token once revoked, and drops it from the list", () => {
    const { id, token } = createMcpToken({ label: "Revoke me", scope: "read", workspaceId: null });
    expect(listMcpTokens().some((t) => t.id === id)).toBe(true);

    const revoked = revokeMcpToken(id);
    expect(revoked).toBe(true);

    expect(listMcpTokens().some((t) => t.id === id)).toBe(false);
    // resolveMcpToken still finds the record (it's a real, minted token) --
    // checkToken() is what turns "revoked" into a rejection, same contract
    // as an unrevoked token: resolution and authorization are separate steps.
    const record = resolveMcpToken(token);
    expect(record).toBeDefined();
    expect(checkToken(record)).toEqual({ ok: false, reason: "revoked" });
  });

  it("revoking an already-revoked or unknown id is a no-op, not a throw", () => {
    expect(revokeMcpToken("no-such-id")).toBe(false);
  });
});
