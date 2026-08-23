# Pepiros

**Read [`docs/PLAN-V1.md`](docs/PLAN-V1.md) first.** It is the canonical product/architecture spec: one-liner, locked decisions, data model, the grounding spine, MCP layer, schedule, and the cut list of things deliberately not to build. This file is only harness-facing conventions; don't duplicate its content here.

## Commands

```bash
npm install
cp .env.example .env      # optional -- the app runs fine on fixtures/workspace.json without it
npm run dev                # http://localhost:3000/w/ws-1
npm run typecheck          # tsc --noEmit, run before considering any change done
npm run lint
npm run build
npm run db:generate        # drizzle-kit generate, needs DATABASE_URL
npm run db:migrate
npm run db:studio
npm run seed                # scripts/seed.ts -- still a stub
npm run mcp:stdio           # mcp/stdio.ts -- a real server, see below, not a stub
```

`npm test` is Vitest over `lib/**/*.test.ts` (318 cases): the grounding spine, layout, graph visibility, citation parsing, the service layer, and the LLM/chat agents, the last two mocked at the model level, so no API key is needed. It is a different thing from `evals/`, which is reserved for golden-paper generator evals and is still a stub. `npm run typecheck` plus `npm test` is the correctness bar. Run both after every change to `lib/`.

Vitest only collects `lib/**`, so **pure logic worth testing belongs in `lib/`, not `components/`** -- that's why the canvas's collapse/visibility rules live in `lib/graph/visibility.ts` rather than inside `GraphCanvas.tsx`.

`npm run mcp:stdio` is a working server, not a stub. Verify changes to `mcp/*` by connecting a real client rather than only typechecking: the tool layer is plain functions, but transport and schema registration only fail at runtime. **Nothing may write to stdout in the MCP process**: stdout *is* the JSON-RPC transport, so diagnostics go to stderr or the client disconnects on a parse error.

**Don't run `npm run build` while `npm run dev` is live.** The production build overwrites `.next` and the dev server then 500s with `Cannot find module './vendor-chunks/*.js'`. It looks like a real bug and isn't; `rm -rf .next` and restart.

## Current data seam

**No live Supabase project is provisioned.** Everything reads through `lib/services/workspace.ts`'s `fetchWorkspace()`, which always resolves `fixtures/workspace.json` regardless of the workspace id passed in. That function is the *only* place a real backend read would replace the fixture. Don't thread a second data path through components directly.

**This project runs on Groq + Featherless, not Anthropic.** `lib/ai/client.ts`'s `fastModel()`/`strongModel()` are the only place a model gets resolved: `lib/agents/*` calls only those two functions, never `createGroq(...)`/`createOpenAICompatible(...)` directly. Each tier is Groq (primary) wrapped in `lib/ai/fallbackModel.ts`'s `withFallback()` around Featherless (fallback, OpenAI-compatible, no first-party AI SDK provider: goes through `@ai-sdk/openai-compatible`); the wrapper reroutes only on a 401/402/403/429 or provider-marked-retryable error from Groq, never on a malformed-request error that Featherless would hit identically. Either provider works alone if only one API key is set.

Groq model choice is constrained, not just optimized: every call in this codebase goes through `generateObject`, and only `openai/gpt-oss-20b`/`-120b` support structured outputs on Groq at all, confirmed live, not from docs alone (`llama-3.1-8b-instant` has a far higher rate limit but 400s on any `response_format: json_schema` call). Don't swap either Groq model id without checking Groq's structured-outputs supported-models list first.

**A prompt is a request, not a guarantee, and two real Groq behaviours already prove it.** Both fixes are defensive on purpose: don't "simplify" either back to trusting the prompt:

- A generator is told to cite the bare token (`C7`), not the full bracketed header (`C7 | Methods | p.4`), and a real model returned the header anyway. `lib/agents/orchestrator.ts`'s `normalizeRef()` strips to the leading token before verification, so a non-compliant model still resolves instead of registering as `hallucinated_ref`.
- Chat is told to cite `[C7]` in ASCII brackets, and gpt-oss models routinely answer with CJK fullwidth `【C7】`. `lib/chat/citations.ts` accepts the variants; with ASCII-only matching, a correctly-grounded answer parsed to zero citations and reported itself as **ungrounded**, which is the worst failure this product has. That module is shared by the server pipeline and the client renderer so the two cannot drift; if you change the marker format, change it there and nowhere else.

Tests mock the model at the `LanguageModelV2` level (`lib/testing/mockLanguageModel.ts`) so nothing in `lib/agents/*` or `lib/services/chat.test.ts` needs a real API key. Note the two `generateObject` shapes differ: enum mode wraps its value as `{ result }`, schema mode returns the schema's own shape (e.g. `{ route }`), mock the right one or the call fails validation.

It lives under `lib/services/` rather than `lib/store/` because server routes must not import the client zustand module to reach it. `lib/store/workspace.ts` re-exports it for client consumers and owns `useWorkspaceStore`; server code imports `lib/services/workspace.ts` directly.

`fixtures/workspace.json` and `types/anchor.ts` are a frozen contract (docs/PLAN-V1.md §18): `lib/*` and `components/*` both code against this shape, not against each other. If you change either, both `lib/*` and `components/*` consumers need to stay in sync, so check `grep -rl "types/anchor"` and `grep -rl "workspace.json"` before editing either file.

## Conventions

- **The grounding spine is the product.** `lib/grounding/verify.ts`'s tier thresholds (`token_set_ratio >= 0.92` → `quote_located`, `>= 0.75` → `paraphrase`, else `unsupported` + anchor dropped) and the entailment-overlap floor in `lib/grounding/entail.ts` are deterministic by design: no LLM judge, ever. Don't "simplify" this into a model call.
- **"Verified" is a banned word.** Anywhere evidence/quote state is surfaced (UI copy, API responses, code comments), the only tier labels are "quote located" / "paraphrase" / "unsupported". A fuzzy-matched quote proves quotation provenance, not entailment (docs/PLAN-V1.md §4).
- **Never trust a client-asserted `quote_located`.** Any endpoint that accepts a claimed evidence tier (MCP `verify_claim`/`create_node`, `/api/verify`) must re-run `lib/services/verify.ts` server-side against the corpus, not just record what the caller said.
- **Service-layer boundary**: `app/api/*` and `mcp/tools/*` call only `lib/services/*`, never `lib/grounding/*` or `lib/db/*` directly. Both surfaces are live now, so this is what keeps them re-verifying through one path instead of two that drift.
- **Layout is a pure function, computed once at the data seam.** `lib/layout/computeLayout()` is called inside `fetchWorkspace()`, so API, MCP, and the client store all get identical positions: laying out in a component would leave the other callers on stale coordinates. Never measure the DOM to lay out (it isn't server-computable) and never add a force/physics layout (same graph must always land identically). Footprints are the hardcoded table in `lib/layout/footprints.ts`; if a node card's width class changes, change it there too or spacing silently goes wrong.
- **Upload limits live in one place.** `MAX_UPLOAD_BYTES` / `MAX_PAGES` in `lib/services/upload.ts`, imported by both the route and the UI. Don't re-hardcode 50MB or 120 anywhere. A rejection must name the actual problem ("scanned PDF, no text layer"), per docs/PLAN-V1.md §6; a generic failure here is a bug, not a style choice.
- **Design tokens only.** `app/globals.css` / `tailwind.config.ts` define the full "lab notebook at night" palette (`surface`/`paper`/`ink`/`border`/`pillar-1..6`/`located`/`paraphrase`/`unsupported`) and font families (`font-serif` for reading prose, `font-sans` for UI chrome, `font-mono` for citation ids). Don't introduce new colors or a light theme.
- **Pillar color is structural, not decorative.** A node, its edges, and any chip referencing the same pillar all pull from `pillarColor()` in `components/ui/PillarChip.tsx`.
- **Cut list (docs/PLAN-V1.md §20), do not rebuild these**: pgvector/embeddings/BM25, elkjs/auto-layout (nodes carry deterministic `x`/`y` already), a deployed Python service (PyMuPDF/PaddleOCR run as local scripts only), `role="application"` on the canvas (breaks screen readers), minimap, light theme, SM-2 spaced repetition / adaptive quiz difficulty.
- **Multi-span anchors are required, not optional.** `Evidence.anchor.spans` is always an array; aggregate claims can have 2+ rects. Never assume `spans.length === 1`.
- **Any settings write path must check `isDemoAccount()` (`lib/data/demo.ts`), not just the UI.** `ProfileForm`/`DangerZone`/logout-everywhere/delete-account already gate this way; `McpTokens`/`NotificationPrefs` shipped without it (issue #214) and the shared demo account could mint a real MCP token or make a notification-pref write actually persist, contradicting `DemoNotice`'s own promise that "changes are not saved." The client-side `readOnly` prop disabling controls is not enough on its own -- the server action/route is the one that actually has to refuse.
- TypeScript strict mode is on (`tsconfig.json`). Any component using hooks/state/React Flow/zustand needs `"use client"`.

## Ownership

Maintained by Anay Dhawan. `types/anchor.ts` and `fixtures/workspace.json` are the frozen contract both `lib/*` and `components/*` code against, so a change to either needs every consumer updated in the same pass: check `grep -rl "types/anchor"` and `grep -rl "workspace.json"` first.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
