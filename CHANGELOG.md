# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/) once it has a real release — pre-1.0, expect breaking changes without notice.

## [Unreleased]

Still stubbed (see the `TODO` comment at the top of each file): PDF ingestion (`scripts/parse.py`, `scripts/ocr_fallback.py`, `app/api/ingest`), the LLM generator fan-out (`lib/agents/*`), the MCP server (`mcp/*`), graph-mutation endpoints (`app/api/nodes/*`, `/api/compare`), and chat/export/auth. None of these have a live Supabase or Anthropic project behind them yet.

### Added

- `lib/services/related.ts`: real Semantic Scholar Recommendations API client (free, no key) for the Related Papers rail. Resolves a paper by title search, then fetches recommendations; returns a typed `status` (`ok`/`no_match`/`rate_limited`/`error`) rather than throwing, so a miss or an outage renders an honest empty state instead of silently failing or faking a result.
- `lib/services/citationExpand.ts`: real OpenAlex API client (free, no key) for citation-graph expansion. Resolves a paper by title search, then walks one hop via `referenced_works` (`cites`) or the `cites:` filter (`cited_by`); same typed-status contract as `related.ts`.
- `lib/services/externalFetch.ts`: shared fetch helper for both (timeout, typed error, rate-limit classification) so neither service duplicates that plumbing.
- `GET /api/related` and `GET /api/expand` are now real (previously `501`s); `POST /api/expand` stays `501` since ingesting a selected ghost node needs the (still-stub) ingest pipeline.
- `RelatedPapersRail` fetches live data client-side and renders `no_match`/`rate_limited`/`error` states distinctly instead of the static illustrative cards it previously always showed.
- `GraphCanvas` fetches citation expansion for every paper node (both directions) after the base graph loads and renders results as `GhostCitationNode`s at the canvas edge, wired to the real endpoint; "Add to workspace" now calls the real `POST /api/expand` and surfaces its `501` honestly instead of only logging to the console.
- Vitest coverage for all three new service files, including a live-observed edge case (see Fixed).
- Vitest suite over the grounding spine (`npm test`), wired into CI. The 0.1.0 notes below described the spine as "tested" when no test runner existed; this is that claim made true.
- Repository scaffolding: GitHub issue and PR templates, Dependabot, and a CI workflow running typecheck, lint, test, and build on every push and PR.
- `eslint.config.mjs`. ESLint 9 requires flat config, so `npm run lint` had never been capable of running despite CONTRIBUTING listing it as a merge gate.
- `docs/PLAN-V1.md`, vendored in. Roughly thirty `TODO` comments cite it for the detail they need and it was not reachable from a clone.
- `chunks.ordinal` and `numerics.ordinal`, plus `.editorconfig`, `.nvmrc`, and an `engines` field.

### Fixed

- `classifyExternalError` only treated HTTP 429 as rate-limited. OpenAlex's anonymous-search tier returns a plain `503` with `Retry-After` when its search cluster is overloaded rather than quota-limiting a specific caller -- observed directly against the live API while building `citationExpand.ts`. Both now classify as `rate_limited`, so the UI gives the same "try again shortly" message either way instead of a generic error.
- A claim asserting a bound (`p < 0.05`) against a source reporting a value inside it (`p = 0.003`) was demoted to `unsupported`. `numericTokenMatchesRow` compared values for equality and ignored the comparator it had already parsed, so exact quotes failed the entailment floor on the phrasing most common in the target corpus.
- Citation ids were assigned from array position, so ingesting a paper renumbered every `C{n}` and silently re-pointed already-written `evidence` rows at different text. They now come from a persisted `ordinal` assigned once at ingest.
- The reverse audit scored every (sentence, chunk) pair with a full Levenshtein pass over whole chunk texts. Imperceptible against the 18KB fixture, minutes against a real corpus. Now pruned with an admissible length-ratio bound, which returns the same best chunk: a 10-sentence audit over 300 realistic chunks went from ~10.3s to ~0.5s.
- `app/api/audit` reached into `lib/grounding/*` directly, breaking the service-layer boundary CLAUDE.md defines. Added `lib/services/audit.ts`.
- Server routes imported `fetchWorkspace` from the client zustand store, pulling a client-state container and the whole fixture into the server bundle. The read moved to `lib/services/workspace.ts`; `lib/store/workspace.ts` re-exports it for client consumers.
- `PaperArchetype` in the frozen `types/anchor.ts` contract listed six archetypes; `lib/agents/archetypeClassifier.ts` specified a different nine. Reconciled on the classifier's set, and the fixture's papers remapped (`meta_analysis` to `systematic_review`, `observational` to `cohort_study`).

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
