# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/) once it has a real release — pre-1.0, expect breaking changes without notice.

## [Unreleased]

Still stubbed (see the `TODO` comment at the top of each file): PDF ingestion (`scripts/parse.py`, `scripts/ocr_fallback.py`, `app/api/ingest`), the LLM generator fan-out (`lib/agents/*`), the MCP server (`mcp/*`), and most `app/api/*` routes beyond `verify`/`audit`/`graph`. None of these have a live Supabase or Anthropic project behind them yet.

## [0.1.0] - 2026-08-05

### Added

- Grounding spine (`lib/grounding/*`): deterministic fuzzy-match quote verification (`token_set_ratio`, no LLM judge), the numeric entailment overlap floor, and citation-ref resolution.
- Data layer: full Drizzle schema across all 18 tables in the plan.md §5 data model, Supabase browser/server/service clients, `drizzle.config.ts`.
- Shared contract: `types/anchor.ts` and a worked `fixtures/workspace.json` (3 papers, a contradiction pair, a cross-paper cites link, and one planted misattribution that the verifier correctly demotes to `unsupported`).
- Full UI: React Flow canvas (5 node types + ghost citation nodes + kind-colored edges), the doc-reader view (default landing surface), outline/audit/learn/canvas/share pages, chat dock, node inspector, flashcards/quiz, numeric charts — all against the "lab notebook at night" dark-first design tokens.
- Real API routes: `POST /api/verify` (single-claim re-verification), `POST /api/audit` (reverse audit — paste external text, sentence-split, verify each sentence against the corpus), `GET /api/graph/[workspaceId]`.
- Placeholder `501` handlers for the remaining `app/api/*` routes that need LLM/job-queue/live-DB infra not yet provisioned, so the app builds cleanly end to end.
- Project documentation: README, CLAUDE.md, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE (MIT).

### Fixed

- Entailment-floor check was scoped to a single `Numeric` row instead of every numeric belonging to the resolved chunk — caught via a sanity check against the fixture and fixed before it shipped.
- A `"95% CI ..."` confidence-interval annotation was being treated as its own claimed statistic, causing false `unsupported` verdicts on otherwise-exact quotes; the numeric-token extractor now excludes it.

## [0.0.1] - 2026-08-02

### Added

- Initial repository scaffold: folder structure, one-line `TODO` header per file, `plan.md` handoff.
