# Contributing to Pepiros

Thanks for looking at this. Pepiros is an early-stage hackathon build (see [`plan.md`](plan.md) for the full spec and schedule) — expect things to move fast and change shape.

## Getting set up

```bash
git clone https://github.com/AnayDhawan/pepiros.git
cd pepiros
npm install
cp .env.example .env   # only needed if you have a Supabase/Anthropic project; the app runs on fixtures/workspace.json without it
npm run dev
```

Node 20+. There's no live database or model provider wired up by default — see [`CLAUDE.md`](CLAUDE.md)'s "current data seam" section for how `lib/services/workspace.ts`'s `fetchWorkspace()` is the one place that changes when a real backend exists.

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four should pass, and CI runs exactly these. `npm test` is Vitest over `lib/**/*.test.ts` and currently covers the grounding spine; it is not the same thing as `evals/`, which is reserved for golden-paper generator eval cases per plan.md §9 and is still a stub. Anything touching `lib/grounding/*` should arrive with a test, since that code is the product. For UI changes, add an `npm run dev` smoke test of whatever you touched.

## Code conventions

- Read [`plan.md`](plan.md) §2 ("locked decisions — do not reopen these") and §11 (cut list) before proposing pgvector/embeddings, elkjs/auto-layout, a deployed Python service, a light theme, or spaced-repetition scheduling — these were deliberately killed, not overlooked.
- The grounding spine (`lib/grounding/*`) is deterministic on purpose — fuzzy quote matching + a numeric entailment floor, no LLM judge. Don't replace a threshold check with a model call to make something "smarter."
- Never write UI copy, API responses, or comments that call a grounded claim "verified." The only tier labels are quote located / paraphrase / unsupported (plan.md §4).
- Use the existing design tokens (`app/globals.css`, `tailwind.config.ts`) — no new colors, no light theme.
- TypeScript strict mode is on; keep it passing rather than reaching for `any` or `@ts-ignore`.
- Match the existing comment style: none by default, one line only when it explains a non-obvious constraint or invariant (see any file under `lib/grounding/` for the tone).

## Ownership

Per plan.md §8, the rough split is `lib/`/`scripts/`/`mcp/`/`app/api/*` (Anay) vs. `components/`/`app/(app)/*` (Yash), with `types/` and `fixtures/` shared and requiring a heads-up to both before changing. This isn't enforced by tooling — it's just where merge conflicts are most likely, so flag cross-cutting changes in your PR description.

## Commit messages

Focus on *why*, not *what* — the diff already shows what changed. No strict format is enforced, but keep the subject line under ~70 characters and use the body for rationale if it's not obvious from the diff alone.

## Reporting bugs / security issues

Regular bugs: open a GitHub issue. Security vulnerabilities: see [`SECURITY.md`](SECURITY.md) — please don't file those as public issues.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Be excellent to each other.
