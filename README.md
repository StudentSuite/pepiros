<div align="center">

# Pepiros

**Turn a research PDF into a knowledge graph where every generated claim stays bound to a located quote, and hand that grounding to Claude as a callable MCP service.**

[![CI](https://github.com/StudentSuite/pepiros/actions/workflows/ci.yml/badge.svg)](https://github.com/StudentSuite/pepiros/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-5FA04E.svg)](.nvmrc)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](tsconfig.json)

[Quick start](#quick-start) · [What works today](#what-works-today) · [Architecture](#architecture) · [Design system](#design-system) · [Configuration](#configuration) · [Contributing](CONTRIBUTING.md)

</div>

---

## What it does

Upload a paper, or paste an arXiv / PMC / DOI link. Pepiros extracts its structure, generates a summary and thematic "pillars," and backs every generated claim with a quote it can point at in the source PDF: page, rect, and match score included.

The verification is deterministic. No LLM judges another LLM:

```text
for each claimed {ref, quote}:
  chunk = resolve(ref)                                  # stable citation id, not a vector lookup
  if !chunk                        -> drop, log hallucinated_ref
  score = token_set_ratio(quote, chunk.text)
  if   score >= 0.92               -> quote located
  elif score >= 0.75               -> paraphrase   (badged, kept)
  else                             -> drop the anchor, strip [^eN] from the prose
```

On top of that sits an **entailment overlap floor**: every number, unit, and comparator a claim asserts must also appear in the anchored chunk's numerics. That is what catches the real failure mode, a genuine quote attached to a reversed or overstated conclusion, which fuzzy matching alone scores 1.0.

> **No claim is ever labelled "verified."** The badge reads **quote located**, because a fuzzy-matched quote proves *quotation provenance*, not *entailment*. Claim and quote render side by side so the reader adjudicates. This is a deliberate, load-bearing constraint, not hedging.

[`plan.md`](plan.md) is the canonical spec: architecture, data model, locked decisions, and the list of things deliberately **not** built. This README is the entry point.

---

## What works today

Early build, moving fast. Honest status:

### Working

| Area | State |
| --- | --- |
| **Grounding spine** (`lib/grounding/*`) | Quote verification, entailment floor, reverse audit, citation-ref resolution. Deterministic, no model calls. |
| **Data model** (`lib/db/schema.ts`) | All 18 tables from `plan.md` §5, in Drizzle. Schema only, no migrations run yet. |
| **UI** (`components/*`, `app/(app)/*`) | React Flow canvas (5 node types, ghost citation nodes, kind-coloured edges), doc-reader, outline, audit, learn, and share views. Reads the bundled fixture. |
| **Citation APIs** (`lib/services/related.ts`, `lib/services/citationExpand.ts`) | Real Semantic Scholar + OpenAlex calls (free, no key) for the related-papers rail and canvas citation expansion. Typed `ok`/`no_match`/`rate_limited`/`error` status, never fabricated fallback data. |
| **LLM layer** (`lib/agents/*`) | Archetype classifier, archetype-conditioned pillar planner, and 6 of the 21 node generators (`summary`, `methodology`, `statistical_validity`, `stated_limitations`, `weaknesses`, `does_not_establish`), fanned out via `p-queue` with per-node failure isolation. Runs on **Groq (primary) + Featherless (fallback)**, not Anthropic — see [Configuration](#configuration). Every claimed quote is re-verified through the grounding spine before it becomes a real evidence row. Verified end to end against both live APIs, not just mocked. |
| **API** | `POST /api/verify`, `POST /api/audit`, `GET /api/graph/[workspaceId]`, `GET /api/related`, `GET /api/expand` |
| **Tooling** | Typecheck, lint, test, and build all gated in CI on every push and PR. 76 Vitest cases, including the LLM layer tested against a hand-rolled mock model (no API key or network call needed). |

### Not built yet

Each of these is a one-line `TODO` at the top of its file, describing what belongs there.

| Area | Missing |
| --- | --- |
| **Ingest** | `scripts/parse.py` (PyMuPDF), `scripts/seed.ts`, `scripts/ocr_fallback.py`, `lib/services/ingest.ts`, `POST /api/ingest`, `GET /api/jobs/[id]` |
| **Remaining generators** | 15 of the 21 in `docs/PLAN-V1.md` §8 (`contributions`, `background`, `jargon`, `biases`, `novelty`, `reproducibility`, `dataset_notes`, `ethics`, `clinical_relevance`, `future_work`, `equations`, `figures`, `concept_links`, `flashcards`, `quiz`) — mechanical repeats of the pattern in `lib/agents/generators/`, plus figure vision, which needs cropped rasters from the still-stub ingest pipeline |
| **Graph & synthesis** | `lib/services/nodes.ts`, `lib/services/synthesis.ts`, both `lib/layout/*`, `POST /api/compare`, `PATCH`/`DELETE /api/nodes/[id]` |
| **MCP** | All 12 tools, `mcp/server.ts`, stdio transport, resources, prompts |
| **Chat & export** | `POST /api/chat` (streaming, grounded), `/api/chat/promote`, `GET /api/export` |
| **Measurement** | `evals/`, `scripts/measure-drop-rate.ts` |

**Everything currently reads one fixture.** `lib/services/workspace.ts`'s `fetchWorkspace()` returns `fixtures/workspace.json` regardless of the workspace id passed to it. No Supabase project is provisioned and no PDF has been through this system yet. That single function is the seam where a real backend replaces the fixture. The LLM layer works today, but only if you supply at least one of `GROQ_API_KEY` or `FEATHERLESS_API_KEY` — nothing calls it yet without one.

---

## Quick start

```bash
git clone https://github.com/StudentSuite/pepiros.git
cd pepiros
npm install
npm run dev
```

Open **<http://localhost:3000/w/ws-1>**. `ws-1` is the only workspace id the fixture defines.

No environment file, database, or API key is needed to run it: the app is fully functional against `fixtures/workspace.json`, which ships 3 papers, a contradiction pair, a cross-paper `cites` link, and one planted misattribution that the verifier correctly demotes to `unsupported`.

Requires Node 20 or newer.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` across the repo |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest over `lib/**/*.test.ts` |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle Kit against `DATABASE_URL` |
| `npm run seed` | `scripts/seed.ts` (stub) |
| `npm run mcp:stdio` | MCP server over stdio (stub) |

---

## Architecture

```text
Next.js 15 (App Router, TS, React 19)          -> Vercel
  app/api/*         HTTP surface for the UI
  mcp/server.ts     MCP surface for Claude
  lib/services/*    <- BOTH of the above call only this
  lib/grounding/*   deterministic verification, no model calls
  lib/agents/*      archetype classifier, pillar planner, node generators -> Groq, falling back to Featherless (lib/ai/client.ts)

Supabase          Postgres (no vector column), Storage, Auth, Realtime (job status)
scripts/parse.py  local PyMuPDF run: sections, chunks, figures, equations, refs, numerics
scripts/ocr_fallback.py   local PaddleOCR-VL, for scanned or table-heavy pages
```

Three things that look like omissions and are not. There are **no embeddings and no vector column**: a paper is 8-20k tokens, so the whole thing goes in context behind a prompt cache, addressed by stable citation ids. There is **no deployed Python service**: PyMuPDF and PaddleOCR run as local scripts, so there is no second deploy target. There is **no auto-layout engine**: node positions are computed server-side and deterministically. See [`plan.md`](plan.md) §2 and §11 before proposing any of them.

Working in this repo with an AI coding agent? Read [`CLAUDE.md`](CLAUDE.md) first.

---

## Configuration

Nothing below is required to run against the fixture. Copy [`.env.example`](.env.example) to `.env` once a real backend exists.

**LLM provider — [Groq](https://console.groq.com/keys) primary, [Featherless](https://featherless.ai/account/api-keys) fallback, not Anthropic. Either works alone:**

| Variable | For |
| --- | --- |
| `GROQ_API_KEY` | Primary. Defaults to `openai/gpt-oss-20b`/`-120b` — the only two Groq models confirmed to support the structured outputs every call here needs; see `lib/ai/client.ts`'s comment before changing either id |
| `FEATHERLESS_API_KEY` | Fallback — used only when Groq 401/402/403/429s or marks its own error retryable (`lib/ai/fallbackModel.ts`). Featherless is OpenAI-compatible with no first-party AI SDK provider — `lib/ai/client.ts` goes through `@ai-sdk/openai-compatible`. Its $25/mo flat-rate plan is contractually for human-driven use in Featherless's own UI, not the programmatic API traffic this is — the metered Developer plan is the one its terms describe as intended for that |
| `FEATHERLESS_MODEL_FAST`, `FEATHERLESS_MODEL_STRONG` | Default to two Qwen2.5 models verified live against a real account (meta-llama's repos there are gated behind a HuggingFace org connection and 403 without it) |

**Free account:**

| Variable | For |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Postgres, Storage, Auth, Realtime |
| `DATABASE_URL` | Drizzle's direct Postgres connection |

**Free, no key required:**

| Variable | For |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | MCP results carry deep links back into the canvas, so the app needs to know its own origin |
| `OPENALEX_MAILTO`, `CROSSREF_MAILTO` | Courtesy identifiers that move requests into the polite rate-limit pool |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional. Unauthenticated access is enough unless the related-papers rail starts returning 429 |
| `MCP_TOKEN_SECRET` | Self-generated, any long random string |

---

## Design system

**Direction: Editorial Paper** (Are.na × Instapaper/NYT Reader), on top of the "lab notebook at night" thesis — dark chrome, a warm paper-white reading surface, pillar colour as a structural system. Full brief and the canonical palette: [`design/DIRECTIONS.md`](design/DIRECTIONS.md). Live token reference: `/dev/tokens`.

| Layer | Where |
| --- | --- |
| Tokens (color, spacing, radius, elevation, motion, layout dims) | `app/globals.css`, `tailwind.config.ts` |
| Fonts (Source Serif 4, Inter, JetBrains Mono via `next/font`) | `app/layout.tsx` |
| Primitives (Button, Input, Dialog, Drawer, Tooltip, Popover, Tabs, Menu, Toast, Skeleton, ErrorBanner, Badge, Icon, Logo, ...) | `components/ui/` |
| Icons | Lucide, only through `components/ui/Icon.tsx` — never a raw `lucide-react` import in a feature component |
| Brand assets (favicon, app icon, OG image) | `app/icon.svg`, `app/apple-icon.tsx`, `app/opengraph-image.tsx` |
| Image-gen prompts (brand kit + all 8 app surfaces) | `design/prompts/`, zipped at `design/pepiros-editorial-paper-prompts.zip` |
| Platform-vision scope (accounts, publish, discovery, discussion) | [`docs/PLAN-V1.md`](docs/PLAN-V1.md) §22 |

Two conventions worth knowing before adding a component: pillar hues have two accessors in `components/ui/PillarChip.tsx` — `pillarColor()` for borders/dots/edge strokes (canonical hex, 3:1 threshold), `pillarTextColor()` for anywhere a pillar hue is literal text colour (lightened for WCAG AA's 4.5:1, three of the seven canonical hues fail it unmixed). And motion reaches for `lib/motion.ts`'s named helpers or the keyframes in `globals.css`, never a hand-picked duration — Editorial Paper is ease-out only, never spring.

---

## Project docs

| File | What |
| --- | --- |
| [`plan.md`](plan.md) | Canonical spec: product, architecture, locked decisions, cut list |
| [`docs/PLAN-V1.md`](docs/PLAN-V1.md) | Long-form reference behind `plan.md`, cited by the `TODO` comments |
| [`CLAUDE.md`](CLAUDE.md) | Conventions and invariants for AI coding agents |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, PR gates, code conventions |
| [`CHANGELOG.md`](CHANGELOG.md) | Keep a Changelog format |
| [`SECURITY.md`](SECURITY.md) | Private vulnerability reporting |

---

## License

[MIT](LICENSE) © Anay Dhawan
