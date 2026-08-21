import type { Profile } from "@/lib/data/types";

/**
 * Google sign-in, via Supabase Auth as the OAuth broker.
 *
 * Supabase is the broker rather than talking to Google directly because the
 * Google client secret then lives in Supabase's config instead of this app's
 * env, and the redirect URI is registered once against the Supabase project.
 * The trade is that the Google provider must be enabled in the Supabase
 * dashboard -- see `isGoogleAuthConfigured` for how the UI stays honest when
 * it isn't.
 *
 * Identity only. Google says who you are; the app's own signed cookie
 * (lib/auth/session.ts) carries that identity afterwards, so there is one
 * session mechanism downstream rather than two competing ones.
 */

export function supabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

export function supabaseAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
}

/**
 * Whether sign-in can work at all. Checked before rendering the button, so a
 * misconfigured deploy shows "sign-in is unavailable" instead of a button
 * that dead-ends on a provider error page.
 *
 * This can only see whether Supabase itself is configured -- whether the
 * Google *provider* is enabled inside that project is not visible from here,
 * and surfaces as a provider error on the callback instead.
 */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

/** Where Supabase sends the browser back to, carrying `?code=`. */
export function callbackUrl(origin: string, next: string): string {
  const url = new URL(`${origin}/auth/callback`);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export interface GoogleIdentityInput {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Letters for the avatar fallback: initials from a name, else the email.
 *
 * The email path uses only the local part. Splitting the whole address would
 * take the second initial from the domain -- alex@example.com reading as
 * "AE" rather than "AL", which is the company's initial, not the person's.
 */
export function initialsFor(name: string | null, email: string | null): string {
  const fromName = (name ?? "").trim();
  if (fromName) {
    const words = fromName.split(/[\s._-]+/).filter(Boolean);
    if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
    if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  }

  const local = (email ?? "").split("@")[0]?.trim() ?? "";
  if (!local) return "??";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0] ?? local).slice(0, 2).toUpperCase();
}

/**
 * A username the rest of the app will accept: `profiles.username` is
 * constrained to `^[a-z0-9_]{3,30}$` in supabase/migrations/0001_platform.sql,
 * and a Google display name is none of those things. Derived from the email
 * local part, padded if too short and truncated if too long, with a short
 * suffix from the account id so two "alex"es don't collide.
 */
export function usernameFor(identity: GoogleIdentityInput): string {
  const local = (identity.email ?? identity.name ?? "user").split("@")[0] ?? "user";
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  const stem = cleaned.length >= 3 ? cleaned : `${cleaned}user`.slice(0, 20);
  const suffix = identity.id.replace(/[^a-z0-9]/gi, "").slice(0, 4).toLowerCase();
  return `${stem}_${suffix}`.slice(0, 30);
}

export function profileFromGoogle(identity: GoogleIdentityInput): Profile {
  const displayName = identity.name?.trim() || identity.email?.split("@")[0] || "Reader";
  return {
    id: identity.id,
    username: usernameFor(identity),
    displayName,
    bio: "",
    avatarInitials: initialsFor(identity.name, identity.email),
    followerCount: 0,
    followingCount: 0,
    joinedAt: new Date().toISOString(),
    onboarded: true,
    // Issue #234: a Google-derived profile is never an admin by construction.
    isAdmin: false,
  };
}
