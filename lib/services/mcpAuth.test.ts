import { describe, expect, it } from "vitest";
import {
  canAccessWorkspace,
  checkToken,
  generateToken,
  hasScope,
  hashToken,
  hashesMatch,
  type McpTokenRecord,
} from "./mcpAuth";

function record(overrides: Partial<McpTokenRecord> = {}): McpTokenRecord {
  return { id: "t1", scope: "read", workspaceId: null, revokedAt: null, ...overrides };
}

describe("generateToken / hashToken", () => {
  it("mints a prefixed 256-bit token", () => {
    const token = generateToken();
    expect(token.startsWith("pep_")).toBe(true);
    expect(token.slice(4)).toHaveLength(64); // 32 bytes hex
  });

  it("never returns the same token twice", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });

  it("hashes deterministically, and the hash is not the token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("hashesMatch", () => {
  it("matches a hash against itself", () => {
    const hash = hashToken("pep_abc");
    expect(hashesMatch(hash, hash)).toBe(true);
  });

  it("rejects a different hash", () => {
    expect(hashesMatch(hashToken("pep_abc"), hashToken("pep_def"))).toBe(false);
  });

  // timingSafeEqual throws on a length mismatch rather than returning false,
  // so a malformed stored hash must not take the process down.
  it("returns false rather than throwing on a length mismatch", () => {
    expect(hashesMatch(hashToken("pep_abc"), "deadbeef")).toBe(false);
  });
});

describe("checkToken", () => {
  it("accepts a live token", () => {
    const result = checkToken(record());
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown token", () => {
    expect(checkToken(undefined)).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects a revoked token even though the row still exists", () => {
    expect(checkToken(record({ revokedAt: new Date(0) }))).toEqual({
      ok: false,
      reason: "revoked",
    });
  });
});

describe("hasScope", () => {
  it("lets a read token read", () => {
    expect(hasScope(record({ scope: "read" }), "read")).toBe(true);
  });

  it("blocks a read token from writing", () => {
    expect(hasScope(record({ scope: "read" }), "write")).toBe(false);
  });

  it("lets a write token do both", () => {
    const writeToken = record({ scope: "write" });
    expect(hasScope(writeToken, "read")).toBe(true);
    expect(hasScope(writeToken, "write")).toBe(true);
  });
});

describe("canAccessWorkspace", () => {
  it("lets an unpinned token reach any workspace", () => {
    expect(canAccessWorkspace(record({ workspaceId: null }), "ws-1")).toBe(true);
    expect(canAccessWorkspace(record({ workspaceId: null }), "ws-2")).toBe(true);
  });

  it("confines a pinned token to its own workspace", () => {
    const pinned = record({ workspaceId: "ws-1" });
    expect(canAccessWorkspace(pinned, "ws-1")).toBe(true);
    expect(canAccessWorkspace(pinned, "ws-2")).toBe(false);
  });
});
