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
    global.__pepirosPg = postgres(getConnectionString(), { prepare: false });
  }
  return global.__pepirosPg;
}

export const db = drizzle(getClient(), { schema });
