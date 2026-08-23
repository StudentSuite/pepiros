# Pepiros

*Installation and Setup Guide*

PROJECT DOCUMENTATION

**Version:** 0.1.1  
**Requires:** Node.js 20 or newer (Node 22 recommended)  
**Prepared:** 24 August 2026  

---

## 1. Prerequisites

- **Node.js 20+** (the repository's `.nvmrc` and CI both pin Node 22).

- **Git**, to clone the repository.

- **Python 3 with PyMuPDF**, only if you plan to ingest a real PDF locally (`pip install -r scripts/requirements.txt`). Not needed to run the app against its bundled demo data.

- **A Groq or Featherless API key**, only if you plan to exercise chat or the generator pipeline. Not needed to browse the bundled fixture workspace.

- **A Supabase project**, only if you plan to run real accounts, real ingest persistence, or the weekly catalog indexer against a real Postgres database. The app runs fully without one, against a bundled JSON fixture.

## 2. Quick start (no configuration required)

The fastest path to a running instance needs no environment file, database, or API key at all:

```text
git clone https://github.com/StudentSuite/pepiros.git
cd pepiros
npm install
npm run dev
```

Then open **http://localhost:3000/w/ws-1** in a browser. `ws-1` is the workspace id the bundled fixture defines: three papers, a contradiction pair, a cross-paper citation link, and one deliberately planted misattribution that the verifier correctly demotes to `unsupported`, so the grounding spine's own behavior is visible immediately.

## 3. Full environment configuration

Copy the example file once a real backend is wanted, and fill in only the sections that apply:

```text
cp .env.example .env
```

### 3.1 Database and platform backend (Supabase)

| Variable | Purpose |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous/public key |
| SUPABASE_SERVICE_ROLE_KEY | Service-role key; also used for the private `papers` Storage bucket that holds ingested PDFs |
| DATABASE_URL | Direct Postgres connection string, used by Drizzle for the grounding-domain schema |
| PEPIROS_PLATFORM_BACKEND | Set to `supabase` once the platform migrations below are applied; unset serves accounts/posts/comments from a deterministic in-memory seed instead, so the guest demo still works with no backend at all |

#### Applying migrations

1. Create a Supabase project and copy its URL/keys into `.env`.

1. Apply the grounding-domain schema: `npm run db:generate` then `npm run db:migrate` (Drizzle Kit, reads `DATABASE_URL`).

1. Apply the platform-domain schema by running the SQL files under `supabase/migrations/` against the same project, in numeric order (`0001_platform.sql` through the latest), via the Supabase SQL editor or the Supabase CLI.

1. Create the `papers` Storage bucket using `supabase/migrations/0006_papers_storage_bucket.sql`, so an ingested PDF persists across deployments rather than only to local disk.

1. Set `PEPIROS_PLATFORM_BACKEND=supabase`.

### 3.2 LLM providers (Groq primary, Featherless fallback)

Every model call in this codebase requires structured output support. On Groq, only `openai/gpt-oss-20b` and `openai/gpt-oss-120b` support that at all (confirmed against the live API, not assumed from documentation) -- do not swap either model id without checking Groq's own structured-output support list first.

| Variable | Purpose |
| --- | --- |
| GROQ_API_KEY | Primary provider (console.groq.com/keys) |
| GROQ_MODEL_FAST | Defaults to `openai/gpt-oss-20b` |
| GROQ_MODEL_STRONG | Defaults to `openai/gpt-oss-120b` |
| FEATHERLESS_API_KEY | Fallback, used only when Groq returns 401/402/403/429 or a provider-marked-retryable error |
| FEATHERLESS_MODEL_FAST | Defaults to `Qwen/Qwen2.5-7B-Instruct` |
| FEATHERLESS_MODEL_STRONG | Defaults to `Qwen/Qwen2.5-72B-Instruct` |
| OPENROUTER_API_KEY | The one vision-capable tier, used for the figure-captioning generator; also serves as a large-context fallback tier |

Either Groq or Featherless works alone. Chat and the claim generators need at least one of the two keys set; every other feature runs without one.

### 3.3 Session and MCP token signing

| Variable | Purpose |
| --- | --- |
| SESSION_SECRET | Signs the app's own session cookie. Any long random string, e.g. `openssl rand -hex 32`. Falls back to a known constant in development; production refuses to start without one. |
| MCP_TOKEN_SECRET | Signs MCP access tokens. Self-generated, any long random string. |

### 3.4 Optional, free, no key required

| Variable | Purpose |
| --- | --- |
| NEXT_PUBLIC_APP_URL | The app's own origin, used so MCP results can carry deep links back into the reader/canvas. Defaults to `http://localhost:3000`. |
| OPENALEX_MAILTO | Moves OpenAlex citation-expansion requests into the polite rate-limit pool |
| CROSSREF_MAILTO | Same, for Crossref DOI resolution |
| SEMANTIC_SCHOLAR_API_KEY | Optional; unauthenticated access is enough unless the related-papers rail starts returning 429 |
| UNPAYWALL_EMAIL | Required by Unpaywall's API to resolve a pasted DOI to an open-access PDF; unset means a DOI upload fails with a named reason rather than doing nothing |
| CRON_SECRET | Authenticates the weekly catalog-indexing cron job; a manual trigger must present the same value |

### 3.5 Enabling Google sign-in

Google sign-in is enabled per-Supabase-project, not per environment variable:

1. In the **Google Cloud Console**, create an OAuth 2.0 client (Web application) and set its authorized redirect URI to `https://<your-project>.supabase.co/auth/v1/callback`.

1. In the **Supabase dashboard**, go to Authentication -> Providers -> Google, paste the client ID and secret, and add your app's origin (e.g. `http://localhost:3000` in development) under Authentication -> URL Configuration -> Redirect URLs.

Until both steps are done the Google sign-in button still renders and fails with an honest message rather than a dead-end provider error. Username/password sign-in and guest browsing are unaffected either way.

---

## 4. Running the application

| Command | Purpose |
| --- | --- |
| npm run dev | Start the Next.js development server |
| npm run build | Production build |
| npm start | Serve a production build |
| npm run typecheck | `tsc --noEmit` across the repository |
| npm run lint | ESLint |
| npm test | Vitest, over `lib/**/*.test.ts` |
| npm run db:generate | Drizzle Kit: generate a migration from schema changes |
| npm run db:migrate | Drizzle Kit: apply migrations to `DATABASE_URL` |
| npm run db:studio | Drizzle Kit's own database browser UI |
| npm run seed | Bulk-load a corpus into Postgres (still a stub) |
| npm run mcp:stdio | Run the MCP server directly over stdio, from source |

One operational note worth knowing before it causes confusion: do not run `npm run build` while `npm run dev` is already running against the same directory. The production build overwrites the `.next` directory the dev server is reading from, and the dev server then fails with a missing-module error that looks like a real bug but is not. Stop the dev server, run `rm -rf .next`, and restart.

## 5. Setting up PDF ingest (optional, local only)

Ingesting a real, user-supplied PDF (rather than browsing the bundled fixture) runs a local Python script and is not available on the hosted deployment, because Vercel's Node runtime has no Python interpreter. To ingest locally:

```text
pip install -r scripts/requirements.txt
```

with a `GROQ_API_KEY` or `FEATHERLESS_API_KEY` set in `.env`. Uploading a PDF that is a scanned image with no text layer fails the ingest job with a clear, specific message rather than silently producing nothing -- OCR recovery for that case is not yet built.

## 6. Setting up the MCP server

Two ways to connect an MCP-compatible client (Claude Desktop, Claude Code, or any other MCP client) to Pepiros. See the Technical Reference document for the full tool list.

### 6.1 Published package (no clone needed)

```text
{
  "mcpServers": {
    "pepiros": {
      "command": "npx",
      "args": ["-y", "pepiros-mcp"]
    }
  }
}
```

### 6.2 From a local clone (for testing a change to mcp/*)

```text
{
  "mcpServers": {
    "pepiros": {
      "command": "npx",
      "args": ["tsx", "mcp/stdio.ts"],
      "cwd": "/absolute/path/to/pepiros"
    }
  }
}
```

### 6.3 Remote connector (hosted, OAuth-secured)

For a hosted MCP client that can only reach a URL rather than spawn a local process, point it at `/api/mcp` on the deployment's own origin (for example `https://pepiros.vercel.app/api/mcp`). The client discovers the OAuth 2.1 flow (dynamic client registration, PKCE) automatically from `/.well-known/oauth-authorization-server` -- no manual token setup is required on the client side.

## 7. Continuous integration

Every push and pull request against `main` runs, in order, against a real ephemeral Postgres service container: `npm run db:migrate`, `npm run typecheck`, `npm run lint`, the no-em-dash house style check, the generator-count consistency check, the full test suite, and a production build. All of these can be run locally with the same commands before pushing.
