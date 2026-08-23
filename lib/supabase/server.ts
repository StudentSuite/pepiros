import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill in your Supabase project's values.`);
  }
  return value;
}

/**
 * How long any single Supabase REST/Auth request may take before it is
 * aborted.
 *
 * WHY THIS EXISTS. supabase-js issues its requests through fetch and sets no
 * AbortSignal, so on this runtime the only ceiling was undici's default
 * 300-second headers timeout. A Supabase instance that accepts a connection
 * and then goes quiet therefore parked a Server Component render for five
 * minutes: long past any user's patience, long past a serverless invocation
 * limit, and long enough to hold the request open while more pile up behind
 * it. lib/services/externalFetch.ts already got this right for the two
 * external APIs; this is the same discipline applied to our own backend.
 *
 * 10s rather than externalFetch's 6s: these are first-party queries on the
 * critical path (a profile read decides a 404), not best-effort enrichment
 * that degrades to an empty state, so the bar for giving up is higher. It is
 * still 30x under the undici default it replaces.
 */
const SUPABASE_TIMEOUT_MS = 10_000;

/**
 * fetch with a hard deadline, handed to supabase-js as its transport.
 *
 * Doing it here rather than at the call sites is the point: there are ~35
 * adapter methods and every one of them would otherwise have to remember, and
 * the one that forgot would be the one that hung.
 *
 * A caller-supplied signal is respected rather than replaced. supabase-js does
 * not currently pass one, but `.abortSignal()` exists in its query builder and
 * silently dropping a caller's cancellation would be a worse bug than the one
 * being fixed. AbortSignal.any is available on the Node 22+ this package
 * requires (see package.json engines).
 */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

/** Server Component / Route Handler client: respects the caller's auth cookie. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Next only permits cookie writes from a Server Action or Route
            // Handler. This same client is also constructed during Server
            // Component renders, and supabase-js calls setAll() from there
            // whenever it refreshes an expiring access token mid-read, which
            // threw "Cookies can only be modified in a Server Action or Route
            // Handler" as an unhandledRejection and took the render down.
            //
            // BACKSTOP ONLY, and it should now be unreachable. The one read
            // that hit it from a Server Component (getProfileByUsername) was
            // moved to createSupabaseAnonClient. If this branch ever runs
            // again, someone added a new Server-Component call path on the
            // cookie-bound client: fix that call site rather than relying on
            // this, because swallowing the write discards a ROTATED refresh
            // token and silently revokes the user's Supabase session.
            //
            // Swallowing is otherwise survivable because Supabase's
            // cookie is not what keeps anyone signed in. This app runs its own
            // session: lib/auth/session.ts writes `pepiros_session`, backed by
            // the sessions table (migration 0003), from the login Route
            // Handler where cookie writes are allowed. Supabase is used for
            // password verification and for profile reads through the anon
            // key, so a dropped Supabase cookie write costs a token refresh
            // that nothing in this codebase reads back, not a logout.
            //
            // Note middleware.ts does NOT construct a Supabase client, so
            // there is no middleware refresh backstopping this. If Supabase
            // auth ever becomes the real session store, this catch has to be
            // revisited rather than left as-is.
            //
            // Deliberately not narrowed to the message string: Next does not
            // export a typed error for this, and matching on prose breaks on
            // any wording change. Route Handlers and Server Actions never
            // reach this branch, so a genuine cookie failure there still
            // surfaces normally.
          }
        },
      },
    },
  );
}

/**
 * Anon client with NO cookie binding. RLS still applies, so this is only for
 * genuinely public reads.
 *
 * Exists because binding a public read to the caller's auth cookie is not
 * free. PostgREST calls auth.getSession() to attach a bearer token, which
 * refreshes an expiring one even with autoRefreshToken disabled, and Supabase
 * ROTATES the refresh token on every refresh. In a Server Component the
 * write-back then throws (Next forbids cookie writes mid-render) and the
 * rotated pair is lost, so the cookie keeps a refresh token GoTrue has already
 * retired. Past the reuse interval that reads as token theft and the session
 * family is revoked: the user is silently signed out of Supabase while
 * pepiros_session happily survives, and change-password, delete-account and
 * signOut all start failing much later with no obvious cause.
 *
 * A public read has no reason to carry that risk, so it does not carry the
 * cookie.
 */
export function createSupabaseAnonClient() {
  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}

/**
 * Service-role client: bypasses RLS. Server-only, used by mcp/server.ts and
 * ingest/verify services that must write across a caller's own row-level
 * permissions (e.g. the seed script). Never import from a client component
 * or a route handler that echoes request input back into a query.
 */
export function createSupabaseServiceClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Copy .env.example to .env and fill in your Supabase project's service role key.");
  }
  return createServerClient(url, serviceKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
