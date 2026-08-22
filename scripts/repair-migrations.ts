/**
 * Brings a hand-built database up to the Drizzle schema, then baselines
 * Drizzle's journal so `npm run db:migrate` can manage it from here.
 *
 * WHY THIS IS NEEDED. This project has two migration folders:
 * `supabase/migrations/` (hand-written, for Supabase-managed tables like
 * profiles and storage buckets) and `lib/db/migrations/` (drizzle-kit
 * generated, for the corpus schema). The live database was built by applying
 * the Supabase folder by hand, and `drizzle.__drizzle_migrations` has zero
 * rows: drizzle-kit has never run against it.
 *
 * That is invisible until a drizzle-only migration adds something. Four did:
 *
 *   0002  mcp_oauth_clients, mcp_oauth_codes   (the OAuth chain)
 *   0003  mcp_tokens.profile_id                (per-account token ownership)
 *   0004  mcp_rate_limit_windows               (the MCP rate limiter)
 *   0005  chunks/numerics.workspace_id         (the ordinal uniqueness constraints)
 *
 * None of those objects existed, so every MCP token, OAuth and rate-limit test
 * failed against a real connection, ingest could not write a chunk at all, and
 * those code paths would fail in production the same way.
 *
 * `npm run db:migrate` cannot fix this on its own: with an empty journal it
 * replays from 0000, and 0000 creates tables that already exist, so it aborts
 * on "relation already exists" before reaching the three that matter.
 *
 * WHAT THIS DOES. Checks for each object individually and applies only what
 * is genuinely absent, then writes journal rows so drizzle's record matches
 * reality. Purely additive: no DROP, no destructive ALTER, no row deleted.
 * Safe to re-run, and a dry run reports the real gap rather than a list of
 * migration filenames.
 *
 * The two NOT NULL columns in 0005 are added nullable, backfilled from their
 * parent row, then tightened, so this is correct against a populated database
 * and not only against an empty one.
 *
 *   npx tsx --env-file=.env scripts/repair-migrations.ts          # report only
 *   npx tsx --env-file=.env scripts/repair-migrations.ts --apply  # do it
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const MIGRATIONS_DIR = path.join(process.cwd(), "lib", "db", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Pass --env-file=.env, or export it first.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function tableExists(name: string): Promise<boolean> {
  const rows = await sql`
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = ${name}`;
  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await sql`
    select 1 from information_schema.columns
    where table_name = ${table} and column_name = ${column}`;
  return rows.length > 0;
}

async function indexExists(name: string): Promise<boolean> {
  const rows = await sql`select 1 from pg_indexes where schemaname = 'public' and indexname = ${name}`;
  return rows.length > 0;
}

/**
 * Each step names what it checks and what it creates, so a dry run reports
 * the real gap rather than "would run migration 0002".
 */
const STEPS: Array<{
  label: string;
  missing: () => Promise<boolean>;
  apply: () => Promise<void>;
}> = [
  {
    label: "0002  mcp_oauth_clients",
    missing: async () => !(await tableExists("mcp_oauth_clients")),
    apply: async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
          client_id          text PRIMARY KEY NOT NULL,
          client_secret_hash text,
          client_name        text,
          redirect_uris      jsonb NOT NULL,
          created_at         timestamp with time zone DEFAULT now() NOT NULL
        )`;
    },
  },
  {
    label: "0002  mcp_oauth_codes",
    missing: async () => !(await tableExists("mcp_oauth_codes")),
    apply: async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
          id             text PRIMARY KEY NOT NULL,
          code_hash      text NOT NULL,
          client_id      text NOT NULL,
          profile_id     text NOT NULL,
          redirect_uri   text NOT NULL,
          code_challenge text NOT NULL,
          scope          mcp_token_scope NOT NULL,
          workspace_id   text,
          expires_at     timestamp with time zone NOT NULL,
          used_at        timestamp with time zone,
          created_at     timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT mcp_oauth_codes_code_hash_unique UNIQUE (code_hash),
          CONSTRAINT mcp_oauth_codes_client_id_mcp_oauth_clients_client_id_fk
            FOREIGN KEY (client_id) REFERENCES public.mcp_oauth_clients (client_id) ON DELETE cascade,
          CONSTRAINT mcp_oauth_codes_workspace_id_workspaces_id_fk
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE cascade
        )`;
    },
  },
  {
    label: "0003  mcp_tokens.profile_id",
    missing: async () => !(await columnExists("mcp_tokens", "profile_id")),
    apply: async () => {
      await sql`ALTER TABLE mcp_tokens ADD COLUMN IF NOT EXISTS profile_id text`;
    },
  },
  {
    label: "0004  mcp_rate_limit_windows",
    missing: async () => !(await tableExists("mcp_rate_limit_windows")),
    apply: async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS mcp_rate_limit_windows (
          key          text PRIMARY KEY NOT NULL,
          count        integer NOT NULL,
          window_start timestamp with time zone NOT NULL
        )`;
    },
  },
  {
    /**
     * The denormalized workspace ids issue #289 added so the ordinal
     * uniqueness constraints can be expressed at the database level.
     *
     * Both are NOT NULL, which a plain ADD COLUMN cannot do on a table that
     * already has rows. Added nullable, backfilled, then tightened: correct
     * whether the tables are empty (they are here) or populated, rather than
     * correct only by luck.
     */
    label: "0005  chunks/numerics workspace_id + ordinal constraints",
    missing: async () => !(await columnExists("chunks", "workspace_id")),
    apply: async () => {
      await sql`ALTER TABLE chunks ADD COLUMN IF NOT EXISTS workspace_id text`;
      await sql`ALTER TABLE numerics ADD COLUMN IF NOT EXISTS workspace_id text`;

      // chunks from their paper; numerics from their chunk, so this order matters.
      await sql`
        UPDATE chunks SET workspace_id = papers.workspace_id
        FROM papers WHERE papers.id = chunks.paper_id AND chunks.workspace_id IS NULL`;
      await sql`
        UPDATE numerics SET workspace_id = chunks.workspace_id
        FROM chunks WHERE chunks.id = numerics.chunk_id AND numerics.workspace_id IS NULL`;

      await sql`ALTER TABLE chunks ALTER COLUMN workspace_id SET NOT NULL`;
      await sql`ALTER TABLE numerics ALTER COLUMN workspace_id SET NOT NULL`;

      await sql`
        ALTER TABLE chunks ADD CONSTRAINT chunks_workspace_id_workspaces_id_fk
          FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE cascade`;
      await sql`
        ALTER TABLE numerics ADD CONSTRAINT numerics_workspace_id_workspaces_id_fk
          FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE cascade`;
    },
  },
  {
    label: "0005  indexes",
    missing: async () => !(await indexExists("chunks_workspace_id_ordinal_idx")),
    apply: async () => {
      await sql`CREATE INDEX IF NOT EXISTS chunks_paper_id_idx ON chunks USING btree (paper_id)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS chunks_workspace_id_ordinal_idx ON chunks USING btree (workspace_id, ordinal)`;
      await sql`CREATE INDEX IF NOT EXISTS edges_workspace_id_idx ON edges USING btree (workspace_id)`;
      await sql`CREATE INDEX IF NOT EXISTS evidence_node_id_idx ON evidence USING btree (node_id)`;
      await sql`CREATE INDEX IF NOT EXISTS nodes_workspace_id_idx ON nodes USING btree (workspace_id)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS numerics_workspace_id_ordinal_idx ON numerics USING btree (workspace_id, ordinal)`;
      await sql`CREATE INDEX IF NOT EXISTS papers_workspace_id_idx ON papers USING btree (workspace_id)`;
    },
  },
];

/**
 * Drizzle records a migration by the SHA-256 of its SQL file, so the journal
 * has to be written from the files themselves rather than from a list of
 * names, or the next `db:migrate` sees a hash mismatch and replays.
 */
async function baselineJournal(): Promise<number> {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let written = 0;
  for (const [i, file] of files.entries()) {
    const contents = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const hash = createHash("sha256").update(contents).digest("hex");
    const existing = await sql`select 1 from drizzle.__drizzle_migrations where hash = ${hash}`;
    if (existing.length > 0) continue;
    // Monotonic, ordered stamps: drizzle sorts by created_at to decide what is
    // already applied, so these must ascend in file order.
    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${hash}, ${Date.now() - (files.length - i) * 1000})`;
    written++;
  }
  return written;
}

async function main(): Promise<void> {
  const gaps: typeof STEPS = [];
  for (const step of STEPS) {
    if (await step.missing()) gaps.push(step);
  }

  if (gaps.length === 0) {
    console.log("Schema is up to date. Nothing missing.");
  } else {
    console.log(`${gaps.length} missing object(s):`);
    for (const gap of gaps) console.log(`  - ${gap.label}`);
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to create them and baseline the journal.");
    await sql.end();
    return;
  }

  for (const gap of gaps) {
    await gap.apply();
    console.log(`applied: ${gap.label}`);
  }

  const written = await baselineJournal();
  console.log(`\nJournal baselined: ${written} row(s) written.`);
  console.log("`npm run db:migrate` will manage this database from here.");
  await sql.end();
}

void main().catch(async (err) => {
  console.error(err);
  await sql.end().catch(() => {});
  process.exit(1);
});
