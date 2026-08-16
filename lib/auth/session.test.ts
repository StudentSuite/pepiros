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
