/**
 * Apply a SQL migration file against DATABASE_URL.
 *
 *   node scripts/apply-migration.cjs supabase/migrations/0002_guest_seed.sql
 *
 * Exists because there is no psql on this machine and `supabase db push` wants
 * the CLI linked to the project. The migrations are written to be idempotent,
 * so re-running one is safe.
 *
 * The file is sent as a single statement batch, so its own BEGIN/COMMIT governs
 * atomicity: a failure part-way rolls the whole file back rather than leaving
 * half a seed behind.
 */
const fs = require("fs");
const path = require("path");

// Minimal .env.local reader. dotenv is not a dependency of this project, and
// adding one for a script that runs a handful of times a year is not worth it.
function loadEnvLocal() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const postgres = require("postgres");

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.cjs <path-to.sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");

  console.log(`applying ${file} ...`);
  try {
    await sql.unsafe(text);
    console.log("applied cleanly");
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((err) => {
  console.error("FAILED:", err.message);
  if (err.detail) console.error("detail:", err.detail);
  if (err.hint) console.error("hint:", err.hint);
  process.exit(1);
});
