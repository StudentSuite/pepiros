# Pepiros

*Technical Reference*

PROJECT DOCUMENTATION

**Version:** 0.1.1  
**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Drizzle ORM, Supabase  
**Prepared:** 24 August 2026  

---

## 1. Architecture overview

```text
Next.js 16 (App Router, TypeScript strict, React 19)   -> deployed on Vercel
  app/api/*         HTTP surface for the web UI
  mcp/*             MCP surface for AI agents (stdio server + remote HTTP/OAuth route)
  lib/services/*    <- BOTH of the above call only this layer
  lib/grounding/*   deterministic verification -- no model calls, ever
  lib/agents/*      archetype classifier, pillar planner, claim generators
                    -> Groq (primary), falling back to Featherless
  lib/layout/*      deterministic, server-computed canvas node positions
  lib/chat/*        citation-marker parsing shared by server and client

Supabase   Postgres (no vector column), Storage, Auth, Realtime
scripts/parse.py          local PyMuPDF run: sections, chunks, figures,
                          equations, references, numerics
scripts/ocr_fallback.py   local PaddleOCR-VL, for scanned/table-heavy pages
```

The service-layer boundary is deliberate and enforced by convention: both the HTTP API (`app/api/*`) and the MCP tool layer (`mcp/tools/*`) call only `lib/services/*`, never `lib/grounding/*` or the database layer directly. That is what keeps both surfaces re-verifying evidence through one shared code path rather than two that could drift apart.

Three things that could look like omissions are deliberate design decisions: there are no embeddings and no vector column (a paper's whole text fits in a model's context window behind a prompt cache, addressed by stable citation ids rather than similarity search); there is no deployed Python service (the PDF-parsing and OCR scripts run locally only, so there is no second deploy target to operate); and there is no force-directed graph layout (canvas node positions are a deterministic, pure function of the graph's own shape, so the same graph always renders identically).

## 2. Data model

The schema spans two domains. The grounding domain (papers, claims, evidence, and everything the reader/canvas render) is defined in Drizzle (`lib/db/schema.ts`) and currently comprises 25 tables. The platform domain (accounts, posts, comments, likes, follows, sessions) is defined in raw SQL migrations under `supabase/migrations/` and currently comprises 8 tables. Thirty-three tables in total.

### 2.1 Grounding domain (selected core tables)

| Table | Holds |
| --- | --- |
| workspaces | A container for one or more papers being read together |
| papers | One ingested source document: title, authors, year, archetype, storage path |
| sections / chunks | A paper's structural sections and the citable text chunks within them, each with its bounding rectangle(s) |
| figures / numerics / references_ | Extracted figure crops, numeric statistics (with kind: point, CI, p-value, n, percent), and a paper's own reference list |
| nodes | A graph node: type is `paper`, `pillar`, `leaf` (claim), `synthesis`, or `thread` (reading path) |
| node_versions | Version history for an edited claim body |
| edges | A typed relation between two nodes: `contains`, `relates`, `derived_from`, `agrees`, `contradicts`, `extends`, `shares_method`, or `cites` |
| evidence | One citation's grounding record: tier, match score, and the anchor rectangle(s) it resolved to, or null if the anchor was dropped |
| conversations / messages | Grounded chat history |
| flashcards / quizzes / quiz_attempts / learning_state | Learn-view state, derived from already-verified claims |
| jobs / job_events | Ingest pipeline job status, streamed to the client over server-sent events |
| share_tokens | Read-only share links |
| mcp_tokens / mcp_oauth_clients / mcp_oauth_codes / mcp_rate_limit_windows | MCP authentication: personal access tokens, OAuth dynamic client registrations, single-use authorization codes, and per-token rate-limit bookkeeping |

### 2.2 Platform domain

| Table | Holds |
| --- | --- |
| profiles | Account: username (`^[a-z0-9_]{3,30}$`), display name, bio, avatar initials, onboarded flag |
| onboarding_responses | Per-account onboarding answers, saved incrementally as the wizard is stepped through, not only on completion |
| posts | A paper published to the public platform by an account |
| comments / likes / follows | Social layer on a published post |
| post_metrics | View/engagement counters for a post |
| sessions | Server-side session records, enabling revocation ('sign out everywhere') |

### 2.3 Invariants enforced in code and tests

- An inline citation marker with no matching evidence row is treated as a render error, caught by CI, never silently ignored.

- `contains` edges (the paper -> pillar -> claim tree) always form a strict tree.

- Deleting a paper cascades its own nodes and chunks, but a cross-paper synthesis node that depended on it is marked stale rather than deleted, so a reader can see what broke.

- A `contradicts` edge with only one side carrying located evidence is rejected at write time, not just hidden later.

---

## 3. The grounding spine, in detail

```text
for each claimed {reference, quote}:
  chunk = resolve(reference)          # a stable citation id, not a vector lookup
  if no chunk found  -> drop the citation, log a hallucinated-reference event
  score = token_set_ratio(normalize(quote), normalize(chunk.text))
  if   score >= 0.92   -> tier = quote_located
  elif score >= 0.75   -> tier = paraphrase   (badged, evidence kept)
  else                 -> tier = unsupported  (anchor dropped, marker stripped)
```

On top of the fuzzy match sits an entailment-overlap floor: every number, unit, and comparator a claim asserts must also appear in the anchored chunk's own extracted numerics. This is what catches a real quote attached to a reversed or overstated conclusion -- a failure mode plain fuzzy matching alone would score as a perfect match.

Both checks are pure, deterministic code with no model call involved, and are covered by their own dedicated test files: anchor resolution, fuzzy matching, numeric entailment, reverse audit, and tier assignment.

## 4. MCP tool reference

All 12 tools below are live, registered in `lib/mcp/registry.ts`, and served identically over both the stdio transport and the remote OAuth-secured HTTP transport.

### 4.1 Search and read

| Tool | Parameters | Returns |
| --- | --- | --- |
| list_papers | workspace_id | Papers in a workspace: id, title, authors, year, archetype |
| search_paper | workspace_id, query, paper_id?, k? | Text chunks matching the query, each with its stable citation id, page, and verbatim text |
| get_outline | workspace_id | A compact text tree: papers, pillars, claim titles, evidence counts |
| get_node | workspace_id, node_id | One node's body, with its citations resolved inline to quote, page, and a deep link |

### 4.2 Verify and write

| Tool | Parameters | Returns |
| --- | --- | --- |
| verify_claim | workspace_id, ref_id, quote, claim? | quote_located / paraphrase / unsupported, the match score, the page, and the numeric-entailment result |
| create_node | workspace_id, parent_id?, title, body_md, evidence[] | The written node. Submitted evidence is always re-verified server-side; a caller cannot assert `quote_located`. |

### 4.3 Audit

| Tool | Parameters | Returns |
| --- | --- | --- |
| find_contradictions | workspace_id, concept? | Claim pairs that contradict each other, both sides evidenced |
| paper_facts | workspace_id, paper_id, kind | `numeric_ledger` (every extracted statistic) or `coverage` (share of the paper's text actually anchored) |

### 4.4 Workspace and ingest

| Tool | Parameters | Returns |
| --- | --- | --- |
| list_workspaces | (none) | Every known workspace: id, name, paper count |
| create_workspace | name | A new, empty workspace id |
| add_paper | workspace_id, url | A job id to poll; accepts arXiv, PMC, or a direct PDF link (DOI resolution not yet supported) |
| get_job | job_id | Stage-by-stage ingest progress and status |

## 5. API surface (HTTP)

| Endpoint | Purpose |
| --- | --- |
| POST /api/verify | Server-side re-verification of a claimed evidence tier |
| POST /api/audit | Reverse-audit an arbitrary summary sentence by sentence |
| POST /api/chat | Grounded chat, one turn |
| POST /api/ingest | Start ingest for an uploaded file or a pasted URL |
| POST /api/compare | Run cross-paper synthesis on a workspace |
| POST /api/share | Mint a read-only share token |
| GET /api/jobs/[id] | Server-sent events stream of an ingest job's progress |
| GET /api/graph/[workspaceId] | The full graph for a workspace |
| GET /api/related, GET /api/expand | Related-papers rail and citation-graph expansion (Semantic Scholar, OpenAlex) |
| GET /api/export | Markdown or BibTeX export of a workspace |
| /api/nodes, /api/nodes/[id] | Full CRUD on a graph node |
| GET /api/papers/[paperId]/pdf | The stored PDF binary for a paper |
| /api/mcp, /api/mcp/oauth/* | The remote MCP transport and its OAuth 2.1 flow |

## 6. Design system tokens

"Editorial Paper" direction: dark UI chrome, a warm paper-white reading surface, and pillar color used as a structural signal (a node, its edges, and any chip referencing the same pillar all draw from the same color function) rather than decoration.

| Layer | Where |
| --- | --- |
| Color, spacing, radius, elevation, and motion tokens | app/globals.css, tailwind.config.ts |
| Fonts: Source Serif 4 (reading prose), Geist (UI chrome), Geist Mono (citation ids and technical metadata) | app/layout.tsx |
| UI primitives (Button, Input, Dialog, Drawer, Tooltip, Popover, Tabs, Toast, Skeleton, Badge, Icon, Logo, and more) | components/ui/ |
| Icons: Lucide, only through the shared Icon wrapper, never a raw import in a feature component | components/ui/Icon.tsx |
| Live, computed token reference (not a hardcoded swatch list) | /dev/tokens route |

## 7. Testing and continuous integration

Vitest covers `lib/**/*.test.ts`: the grounding spine, canvas layout, graph visibility rules, citation-marker parsing, the service layer, and the LLM/chat agent layer (the last two mocked at the model level, so the suite needs no live API key or network call to run). Every push and pull request against the main branch runs, against a real ephemeral Postgres service container: migrations, a full TypeScript typecheck, ESLint, a house style check banning em dashes in authored text, a generator-count consistency check, the full test suite, and a production build.

## 8. Deployment

The application is deployed on Vercel at pepiros.vercel.app. One functional constraint follows directly from that: Vercel's Node.js serverless runtime has no Python interpreter, so the PDF-parsing pipeline (which shells out to a local Python script) only runs against `npm run dev` on a real machine. This applies equally to the scheduled weekly catalog-indexing job (`vercel.json`'s cron calls the same underlying ingest pipeline) as it does to a user's own upload: the hosted deployment can serve a paper's already-built claim graph, but actually parsing a new PDF -- whether from a visitor's upload or from the catalog job -- currently has to happen from a machine with the Python/PyMuPDF dependency installed.
