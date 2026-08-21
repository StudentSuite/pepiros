import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// session.ts caches its HMAC CryptoKey at module scope once secret() has
// been called successfully once -- reusing the same import across tests
// that flip SESSION_SECRET/NODE_ENV would let an earlier test's cached key
// mask a later test's "should throw now" expectation. vi.resetModules() +
// a fresh dynamic import per test gives each one session.ts's real,
// uncached first-call behavior.
beforeEach(() => {
  vi.resetModules();
});

const ORIGINAL_SESSION_SECRET = process.env.SESSION_SECRET;

afterEach(() => {
  // NODE_ENV is set via vi.stubEnv below, which vi.unstubAllEnvs() restores
  // on its own -- NODE_ENV is typed read-only (@types/node), so this can't
  // also assign it back directly the way SESSION_SECRET is restored here.
  vi.unstubAllEnvs();
  if (ORIGINAL_SESSION_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SESSION_SECRET;
});

describe("isSessionSigningConfigured", () => {
  it("is false in production with no SESSION_SECRET -- the exact live bug this guards against", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.SESSION_SECRET;
    const { isSessionSigningConfigured } = await import("./session");
    expect(isSessionSigningConfigured()).toBe(false);
  });

  it("is true in production once SESSION_SECRET is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SESSION_SECRET = "a-real-secret";
    const { isSessionSigningConfigured } = await import("./session");
    expect(isSessionSigningConfigured()).toBe(true);
  });

  it("is true outside production even with no SESSION_SECRET (the dev-only fallback constant)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SESSION_SECRET;
    const { isSessionSigningConfigured } = await import("./session");
    expect(isSessionSigningConfigured()).toBe(true);
  });
});

describe("serializeSession / parseSession", () => {
  it("round-trips a profile id when signing is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SESSION_SECRET;
    const { serializeSession, parseSession } = await import("./session");
    const token = await serializeSession("profile-123");
    expect(await parseSession(token)).toBe("profile-123");
  });

  it("throws rather than silently signing with a known constant in production with no SESSION_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.SESSION_SECRET;
    const { serializeSession } = await import("./session");
    await expect(serializeSession("profile-123")).rejects.toThrow("SESSION_SECRET is not set");
  });
});

describe("parseSessionFull (issue #85)", () => {
  it("returns sessionId: null for the seed adapter, which has no session store to create a row in", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SESSION_SECRET;
    const { serializeSession, parseSessionFull } = await import("./session");
    const token = await serializeSession("profile-123");
    const parsed = await parseSessionFull(token);
    expect(parsed).toEqual({ subject: "profile-123", sessionId: null });
  });

  it("carries a real sessionId through when the adapter provides one", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SESSION_SECRET;
    vi.doMock("@/lib/data/adapter", () => ({
      getAdapter: () => ({ createSession: async () => "session-abc" }),
    }));
    const { serializeSession, parseSessionFull } = await import("./session");
    const token = await serializeSession("profile-123");
    const parsed = await parseSessionFull(token);
    expect(parsed).toEqual({ subject: "profile-123", sessionId: "session-abc" });
  });

  it("still parses a pre-#85, 3-part token (profileId.issued.sig) with sessionId: null", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SESSION_SECRET;
    // Simulates a cookie issued before this change: no sessionId slot at all.
    vi.doMock("@/lib/data/adapter", () => ({
      getAdapter: () => ({ createSession: async () => null }),
    }));
    const session = await import("./session");
    // serializeInlineSession's own output is a real 3-part token (subject.
    // issued.sig, with no sessionId slot) -- exercising it here proves the
    // exact same 3-part shape a pre-#85 password session would also have
    // parses correctly, without hand-rolling HMAC signing in the test.
    const inlineToken = await session.serializeInlineSession({
      id: "u1",
      username: "ada",
      displayName: "Ada",
      bio: "",
      avatarInitials: "A",
      followerCount: 0,
      followingCount: 0,
      joinedAt: "2026-01-01",
      onboarded: true,
    isAdmin: false,
    });
    expect(inlineToken.split(".")).toHaveLength(3);
    const parsed = await session.parseSessionFull(inlineToken);
    expect(parsed?.sessionId).toBeNull();
    expect(parsed?.subject.startsWith("g~")).toBe(true);
  });

  // Issue #169: fromBase64Url()'s atob() throws InvalidCharacterError on a
  // garbled (not just wrong) segment -- confirmed live before this fix --
  // which propagated uncaught out of parseSessionFull()/getSession() and
  // 500'd any route that calls getSession() without its own try/catch.
  it("returns null rather than throwing on a cookie with invalid base64url characters", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.SESSION_SECRET;
    const { parseSessionFull } = await import("./session");
    await expect(parseSessionFull("subject.1700000000000.!!!not-base64$$$")).resolves.toBeNull();
    await expect(
      parseSessionFull("profile-123.session-abc.1700000000000.!!!not-base64$$$"),
    ).resolves.toBeNull();
  });
});
