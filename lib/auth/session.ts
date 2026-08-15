import { cookies } from "next/headers";
import { getAdapter } from "@/lib/data/adapter";
import type { Profile } from "@/lib/data/types";

/**
 * Minimal signed-cookie session.
 *
 * Scope note: this authenticates the demo account so the signed-in surfaces are
 * reachable and route protection is real rather than decorative. It is NOT a
 * production identity system: there is no password hashing (the demo password
 * is a published constant), no refresh, and no revocation. When Supabase auth
 * is wired, this is replaced wholesale rather than extended.
 *
 * WHY WEB CRYPTO AND NOT node:crypto. This runs in middleware.ts, which Next
 * executes on the Edge runtime where `node:crypto`'s createHmac does not exist.
 * `crypto.subtle` is present in both Edge and Node, so one implementation
 * serves middleware, route handlers, and server components. The cost is that
 * signing and verifying are async.
 *
 * The cookie is HMAC-signed so it cannot be forged client-side, httpOnly so it
 * is not readable from JS, and sameSite=lax so it survives normal navigation
 * without riding along on cross-site requests.
 */

const COOKIE = "pepiros_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;

function secret(): string {
  // Falls back to a constant in development so the demo works with no env
  // setup at all. In production an unset secret is a real problem, so it is
  // surfaced loudly rather than silently accepted.
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Refusing to sign sessions with a known constant in production.",
    );
  }
  return "pepiros-dev-only-session-secret";
}

let keyPromise: Promise<CryptoKey> | null = null;

function hmacKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return keyPromise;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function sign(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(payload),
  );
  return toBase64Url(sig);
}

export async function serializeSession(profileId: string): Promise<string> {
  const payload = `${profileId}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function parseSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [profileId, issued, sig] = parts as [string, string, string];

  const payload = `${profileId}.${issued}`;
  // crypto.subtle.verify is constant-time, so this does not leak the signature
  // through timing the way a string compare would.
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    fromBase64Url(sig) as unknown as BufferSource,
    new TextEncoder().encode(payload),
  );
  if (!ok) return null;

  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > MAX_AGE * 1000) return null;

  return profileId;
}

/** Current signed-in profile, or null. Server components and route handlers. */
export async function getSession(): Promise<Profile | null> {
  const store = await cookies();
  const profileId = await parseSession(store.get(COOKIE)?.value);
  if (!profileId) return null;
  return getAdapter().getProfile(profileId);
}
