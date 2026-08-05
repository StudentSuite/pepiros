import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Loud on purpose: db:generate/migrate against an unset URL silently no-ops
  // otherwise and looks like success.
  console.warn("DATABASE_URL is not set -- drizzle-kit will fail. Copy .env.example to .env and fill in Supabase's connection string.");
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
