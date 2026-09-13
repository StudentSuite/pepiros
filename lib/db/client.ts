import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
   
  var __pepirosPg: postgres.Sql | undefined;
}

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase project's connection string (Project Settings -> Database -> Connection string -> URI).",
    );
  }
  return url;
}

/**
 * The one message-free signal separating "no DB configured" (the intentional
 * local/no-backend mode where reads degrade to the static fixture, per
 * CLAUDE.md) from "configured but broken" (DATABASE_URL present, but a
 * query/connection actually fails). lib/services/ingestStore.ts's fallback
 * logic must not catch-and-guess on driver error text -- this is the branch
 * condition it instead uses, exactly duplicating the check getConnectionString()
 * already makes (issue #409).
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Reused across hot-reloads in dev so we don't open a new connection pool
 * on every request. Server-only -- never import this from a client component.
 */
function getClient() {
  if (!global.__pepirosPg) {
    // Left at the library default (a much longer timeout, meant for slow but
    // real connections), a genuinely unreachable host hangs every read for
    // 30+ seconds before lib/services/ingestStore.ts's fallback-to-fixture
    // catch (issue #56) even gets a chance to run. 5s is generous for a
    // reachable Supabase project and fails fast for an unreachable one.
    // connect_timeout bounds the HANDSHAKE only: postgres.js cancels that
    // timer once a socket connects, so a connection that dies mid-life is
    // never reaped and its queries queue forever. The queue is unbounded and
    // has no timeout, so once all connections are stuck every later query
    // awaits a promise that will never settle or reject. Nothing logs, nothing
    // throws, and because this pool is cached on `global` it survives HMR --
    // which is why editing files did nothing and only a full restart cleared
    // it (dev server wedged twice, 2026-08-23).
    //
    // idle_timeout reaps sockets Supabase has already dropped; max_lifetime
    // recycles them before it can; max is lowered because `npm run dev`,
    // drizzle-studio and scripts/index-catalog.ts all draw on the same
    // Postgres connection allowance.
    global.__pepirosPg = postgres(getConnectionString(), {
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      max: 5,
    });
  }
  return global.__pepirosPg;
}

/**
 * A bare `export const db = drizzle(getClient(), {...})` here would call
 * getConnectionString() -- and throw when DATABASE_URL is unset -- the
 * moment anything imports this module, before lib/services/ingestStore.ts's
 * try/catch (issue #56) ever gets a chance to run: that catch wraps the
 * *query* call, not the *import*. CLAUDE.md's own contract is "the app runs
 * fine on fixtures/workspace.json without [a DB]," so this constructs the
 * real drizzle instance lazily, on first actual query, and proxies to it --
 * every call site below still reads as plain `db.select()...` unchanged.
 * Functions are bound to the real instance (not the proxy) since drizzle's
 * chained builders rely on their own `this`.
 */
let realDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

function ensureDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!realDb) {
    realDb = drizzle(getClient(), { schema });
  }
  return realDb;
}

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop) {
      const target = ensureDb();
      const value = Reflect.get(target as object, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  },
);
