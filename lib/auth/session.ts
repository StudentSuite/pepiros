import { cookies } from "next/headers";
import { getAdapter } from "@/lib/data/adapter";
import type { Profile } from "@/lib/data/types";

/**
 * Minimal signed-cookie session.
 *
 * Scope note: this authenticates the demo account so the signed-in surfaces are
 * reachable and route protection is real rather than decorative. It is NOT a
 * production identity system: there is no password hashing (the demo password
 * is a published constant), and there is still no refresh (a session simply
 * expires at MAX_AGE with no silent renewal). Revocation exists now for
 * password sessions (issue #85, via the `sessions` table + createSession()/
 * isSessionRevoked() on the data adapter) -- Google/federated sessions still
 * have none, by design (see serializeInlineSession's own doc comment).
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

/**
 * Whether a session can be signed/verified at all. False only when
 * SESSION_SECRET is unset in production -- secret() below throws in that
 * case rather than falling back to the dev-only constant.
 *
 * Every call site that signs or verifies a session (login, signup, the
 * Google callback, and middleware.ts on *every* protected-route request)
 * needs to check this first: before it existed, a missing SESSION_SECRET in
 * production meant an uncaught throw on every single one of those paths --
 * login/signup 500ing outright, and middleware crashing instead of
 * gracefully redirecting to /login, which is a much worse and harder to
 * diagnose failure than "sign-in is not configured for this deployment."
 */
export function isSessionSigningConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET) || process.env.NODE_ENV !== "production";
}

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

/**
 * Issue #85: adds a server-side-revocable session id alongside the
 * profile id. `createSession()` returns null when no session store is
 * available (seed adapter, or the Supabase adapter before
 * supabase/migrations/0003_sessions.sql has been applied) -- "-" is the
 * placeholder in that case, so the cookie's shape stays consistent either
 * way and old 3-part (pre-#85) cookies keep parsing too (see
 * parseSessionFull() below), rather than forcing every signed-in user to
 * log back in the moment this ships.
 */
export async function serializeSession(profileId: string): Promise<string> {
  const sessionId = (await getAdapter().createSession(profileId)) ?? "-";
  const payload = `${profileId}.${sessionId}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

/** Marks a subject as an inline (federated) profile rather than an adapter id. */
const INLINE_PREFIX = "g~";

/**
 * Session for a federated sign-in (Google), carrying the profile inline
 * rather than as an id to look up.
 *
 * WHY INLINE. A password session stores an id because the adapter owns that
 * account. A Google account has no row in the seed adapter, so an id-only
 * cookie would authenticate to a profile that cannot be resolved, and
 * `getSession()` would return null for a user who just signed in
 * successfully. Carrying the profile in the cookie means Google sign-in
 * behaves the same whether the seed generator or Supabase is behind the app.
 *
 * This is safe precisely because the payload is HMAC-signed: a client can
 * read its own profile (it is theirs, and httpOnly keeps it out of JS
 * anyway) but cannot alter a single field without invalidating the
 * signature. Nothing secret goes in here -- name, email, avatar letters.
 */
export async function serializeInlineSession(profile: Profile): Promise<string> {
  const encoded = toBase64UrlString(JSON.stringify(profile));
  const payload = `${INLINE_PREFIX}${encoded}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

function toBase64UrlString(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeInlineProfile(subject: string): Profile | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(subject.slice(INLINE_PREFIX.length)));
    const parsed = JSON.parse(json) as Profile;
    // A signed cookie cannot have been tampered with, but it can be stale --
    // written by an older build with a different Profile shape. Treat a
    // missing required field as "no session" rather than handing downstream
    // code a half-built object.
    if (!parsed?.id || !parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function verifySignature(payload: string, sig: string): Promise<boolean> {
  // crypto.subtle.verify is constant-time, so this does not leak the signature
  // through timing the way a string compare would.
  return crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    fromBase64Url(sig) as unknown as BufferSource,
    new TextEncoder().encode(payload),
  );
}

function stillFresh(issued: string): boolean {
  const issuedAt = Number(issued);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt <= MAX_AGE * 1000;
}

export interface ParsedSession {
  /** Profile id (password sessions) or the `g~`-prefixed inline-encoded profile (Google). */
  subject: string;
  /** Null for inline sessions and for a pre-#85 cookie issued before this existed. */
  sessionId: string | null;
}

/**
 * The one real parser both parseSession() (middleware, Edge runtime, no DB)
 * and getSession() (needs the sessionId to check revocation) build on --
 * kept as a single implementation so the two never verify the signature
 * differently. Accepts both cookie shapes: 3 parts (subject.issued.sig --
 * every inline/Google session, and any password session issued before
 * issue #85) and 4 parts (profileId.sessionId.issued.sig, every password
 * session issued after).
 */
export async function parseSessionFull(token: string | undefined): Promise<ParsedSession | null> {
  if (!token) return null;
  const parts = token.split(".");

  if (parts.length === 3) {
    const [subject, issued, sig] = parts as [string, string, string];
    if (!(await verifySignature(`${subject}.${issued}`, sig))) return null;
    if (!stillFresh(issued)) return null;
    return { subject, sessionId: null };
  }

  if (parts.length === 4) {
    const [profileId, sessionId, issued, sig] = parts as [string, string, string, string];
    if (!(await verifySignature(`${profileId}.${sessionId}.${issued}`, sig))) return null;
    if (!stillFresh(issued)) return null;
    return { subject: profileId, sessionId: sessionId === "-" ? null : sessionId };
  }

  return null;
}

/** Just the subject, signature/expiry-verified -- middleware.ts's Edge-runtime redirect check never needs the sessionId, so it stays DB-free. */
export async function parseSession(token: string | undefined): Promise<string | null> {
  const parsed = await parseSessionFull(token);
  return parsed?.subject ?? null;
}

/** Current signed-in profile, or null. Server components and route handlers. */
export async function getSession(): Promise<Profile | null> {
  const store = await cookies();
  const parsed = await parseSessionFull(store.get(COOKIE)?.value);
  if (!parsed) return null;
  const { subject, sessionId } = parsed;
  if (subject.startsWith(INLINE_PREFIX)) return decodeInlineProfile(subject);

  // Issue #85: the one place a revoked session actually stops working --
  // logout (this session) and "log out everywhere" (every session for the
  // profile) both just set revoked_at, they don't touch the cookie sitting
  // in some other browser/device.
  if (sessionId && (await getAdapter().isSessionRevoked(sessionId))) return null;

  return getAdapter().getProfile(subject);
}
