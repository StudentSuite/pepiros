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
    global.__pepirosPg = postgres(getConnectionString(), { prepare: false, connect_timeout: 5 });
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
