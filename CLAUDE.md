# Pepiros

**Read [`plan.md`](plan.md) first.** It is the canonical product/architecture spec: one-liner, locked decisions, data model, the grounding spine, MCP layer, schedule, and the cut list of things deliberately not to build. This file is only harness-facing conventions; don't duplicate plan.md's content here.

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
npm run mcp:stdio           # mcp/stdio.ts -- still a stub
```

`npm test` is Vitest over `lib/**/*.test.ts`, currently covering the grounding spine. It is a different thing from `evals/`, which is reserved for golden-paper generator evals per plan.md §9 and is still a stub. `npm run typecheck` plus `npm test` is the correctness bar. Run both after every change to `lib/`.

## Current data seam

**No live Supabase or Anthropic project is provisioned.** Everything reads through `lib/services/workspace.ts`'s `fetchWorkspace()`, which always resolves `fixtures/workspace.json` regardless of the workspace id passed in. That function is the *only* place a real backend read would replace the fixture. Don't thread a second data path through components directly.

It lives under `lib/services/` rather than `lib/store/` because server routes must not import the client zustand module to reach it. `lib/store/workspace.ts` re-exports it for client consumers and owns `useWorkspaceStore`; server code imports `lib/services/workspace.ts` directly.

`fixtures/workspace.json` and `types/anchor.ts` are a frozen contract (plan.md §8): `lib/*` and `components/*` both code against this shape, not against each other. If you change either, both `lib/*` and `components/*` consumers need to stay in sync, so check `grep -rl "types/anchor"` and `grep -rl "workspace.json"` before editing either file.

## Conventions

- **The grounding spine is the product.** `lib/grounding/verify.ts`'s tier thresholds (`token_set_ratio >= 0.92` → `quote_located`, `>= 0.75` → `paraphrase`, else `unsupported` + anchor dropped) and the entailment-overlap floor in `lib/grounding/entail.ts` are deterministic by design: no LLM judge, ever. Don't "simplify" this into a model call.
- **"Verified" is a banned word.** Anywhere evidence/quote state is surfaced (UI copy, API responses, code comments), the only tier labels are "quote located" / "paraphrase" / "unsupported". A fuzzy-matched quote proves quotation provenance, not entailment (plan.md §4).
- **Never trust a client-asserted `quote_located`.** Any endpoint that accepts a claimed evidence tier (MCP `verify_claim`/`create_node`, `/api/verify`) must re-run `lib/services/verify.ts` server-side against the corpus, not just record what the caller said.
- **Service-layer boundary**: `app/api/*` and `mcp/server.ts` (once implemented) should call only `lib/services/*`, never `lib/grounding/*` or `lib/db/*` directly. Keeps both HTTP and MCP surfaces re-verifying through the same path.
- **Design tokens only.** `app/globals.css` / `tailwind.config.ts` define the full "lab notebook at night" palette (`surface`/`paper`/`ink`/`border`/`pillar-1..6`/`located`/`paraphrase`/`unsupported`) and font families (`font-serif` for reading prose, `font-sans` for UI chrome, `font-mono` for citation ids). Don't introduce new colors or a light theme.
- **Pillar color is structural, not decorative.** A node, its edges, and any chip referencing the same pillar all pull from `pillarColor()` in `components/ui/PillarChip.tsx`.
- **Cut list (plan.md §11), do not rebuild these**: pgvector/embeddings/BM25, elkjs/auto-layout (nodes carry deterministic `x`/`y` already), a deployed Python service (PyMuPDF/PaddleOCR run as local scripts only), `role="application"` on the canvas (breaks screen readers), minimap, light theme, SM-2 spaced repetition / adaptive quiz difficulty.
- **Multi-span anchors are required, not optional.** `Evidence.anchor.spans` is always an array; aggregate claims can have 2+ rects. Never assume `spans.length === 1`.
- TypeScript strict mode is on (`tsconfig.json`). Any component using hooks/state/React Flow/zustand needs `"use client"`.

## Ownership

Maintained by Anay Dhawan. `types/anchor.ts` and `fixtures/workspace.json` are the frozen contract both `lib/*` and `components/*` code against, so a change to either needs every consumer updated in the same pass: check `grep -rl "types/anchor"` and `grep -rl "workspace.json"` first.
