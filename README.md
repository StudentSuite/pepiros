# Pepiros

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Pepiros turns a research PDF into a living knowledge graph where every generated claim is bound to a located quote, and exposes that grounding to Claude as a callable MCP service.**

Upload a paper (or paste an arXiv/PMC/DOI link) and Pepiros extracts its structure, generates a summary and thematic "pillars," and backs every generated claim with a deterministically-verified quote from the source PDF — page, rect, and match score included. No claim is ever labeled "verified"; the badge says **quote located**, because a fuzzy-matched quote proves quotation provenance, not entailment. See [`plan.md`](plan.md) for the full product spec, architecture, and rationale — that file is canonical, this README is the entry point.

## Status

This is an early, actively-changing hackathon build (target ship date: Aug 17, 2026 — see `plan.md` §9 for the schedule). What's real today:

- **The grounding spine** (`lib/grounding/*`) — deterministic fuzzy-match quote verification + numeric entailment floor, no LLM judge. Implemented, and covered by a `vitest` suite (`npm test`) that runs against both synthetic corpora and `fixtures/workspace.json`.
- **The full UI** (`components/*`, `app/(app)/*`) — canvas, doc-reader, outline, audit, and learn views, all wired against the same fixture (no live database yet).
- **`/api/verify`, `/api/audit`, `/api/graph`** — real, working routes over the grounding spine.

What's still a stub (see the `TODO` comment at the top of each file): PDF ingestion (`scripts/parse.py`, `app/api/ingest`), the LLM generator fan-out (`lib/agents/*`), the MCP server (`mcp/*`), and most other `app/api/*` routes. None of these have a live Supabase or Anthropic project behind them yet — `lib/services/workspace.ts`'s `fetchWorkspace()` is the single seam where a real backend replaces the fixture.

## Quick start

```bash
git clone https://github.com/AnayDhawan/pepiros.git
cd pepiros
npm install
cp .env.example .env   # fill in values if you have a Supabase/Anthropic project; the app runs on the fixture without them
npm run dev
```

Open [http://localhost:3000/w/ws-1](http://localhost:3000/w/ws-1) — `ws-1` is the only workspace id in the fixture.

Requires Node 20+.

## Environment variables

See [`.env.example`](.env.example) for the full list. Nothing is required to run the app against the fixture — these only matter once a real Supabase project and Anthropic key exist:

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Postgres, Storage, Auth, Realtime (`lib/supabase/*`) |
| `DATABASE_URL` | Drizzle's direct Postgres connection (`lib/db/client.ts`, `drizzle.config.ts`) |
| `ANTHROPIC_API_KEY` | Model routing for generators/chat (`lib/agents/*`, not yet implemented) |
| `MCP_TOKEN_SECRET` | Signing tokens for the MCP server (`mcp/*`, not yet implemented) |

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` across the whole repo |
| `npm run lint` | ESLint |
| `npm test` | Vitest, unit suite over `lib/grounding/*` |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle Kit against `DATABASE_URL` |
| `npm run seed` | Runs `scripts/seed.ts` (still a stub) |
| `npm run mcp:stdio` | Runs the MCP server over stdio (still a stub) |

## Architecture

```text
Next.js 15 (App Router, TS, React 19)        -> Vercel
  app/api/*        HTTP surface for the UI
  mcp/server.ts    MCP surface for Claude
  lib/services/*   <- BOTH of the above call only this

Supabase: Postgres (no vector col), Storage (PDFs/figures), Auth, Realtime (job status)
scripts/seed.ts + scripts/parse.py: local PyMuPDF run, writes chunks/sections/figures/equations/refs/numerics
scripts/ocr_fallback.py: local PaddleOCR-VL run, fallback for scanned/table-heavy pages
```

Full architecture, data model, design system, and demo script live in [`plan.md`](plan.md). If you're an AI coding agent working in this repo, read [`CLAUDE.md`](CLAUDE.md) first.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).

## Security

See [`SECURITY.md`](SECURITY.md) to report a vulnerability.

## License

[MIT](LICENSE)
