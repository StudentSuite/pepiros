# Contributing to Pepiros

Thanks for looking at this. Pepiros moves fast and its surface area is still growing; see [`docs/PLAN-V1.md`](docs/PLAN-V1.md) for the full spec, and `docs/` for formal project documentation (overview, installation, user manual, technical reference).

## Getting set up

```bash
git clone https://github.com/StudentSuite/pepiros.git
cd pepiros
npm install
cp .env.example .env   # only needed if you have a Supabase project or a Featherless API key; the app runs on fixtures/workspace.json without it
npm run dev
```

Node 22+ (`.nvmrc` and `package.json`'s `engines` field both pin this; CI runs Node 22). There's no live database or model provider wired up by default. See [`CLAUDE.md`](CLAUDE.md)'s "current data seam" section for how `lib/services/workspace.ts`'s `fetchWorkspace()` is the one place that changes when a real backend exists.

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm run check:no-em-dashes
npm run check:generator-count
npm test
npm run build
```

All six should pass, and CI runs exactly these (against a real ephemeral Postgres service container). `npm test` is Vitest over `lib/**/*.test.ts` (405 cases across 47 files: the grounding spine, layout, graph visibility, citation parsing, the service layer, and the LLM/chat agents against a mock model); it is a different thing from `evals/`, which runs a starting set of real golden test cases against the actual generator pipeline (structural invariants -- does a claim survive re-verification, are banned generic-critique phrases absent -- not prose-quality judgment, which stays a human review task) and is still growing, not a stub. Anything touching `lib/grounding/*` should arrive with a test, since that code is the product.

Two habits this repo has earned the hard way:

- **Verify against the real thing, not just the types.** A typechecking change can still be wrong. Bugs found only by running it include a model citing with fullwidth `【C2】` instead of `[C2]` (which made grounded answers report themselves as ungrounded), a Groq model that 400s on every structured-output call, and duplicate React keys that silently dropped a real graph edge. For UI, click through with `npm run dev`; for anything touching a model or an external API, make one real call.
- **Put pure logic in `lib/`.** Vitest only collects `lib/**`, so logic buried in a component is logic that will not be tested.

## Code conventions

- Read [`docs/PLAN-V1.md`](docs/PLAN-V1.md) §2 ("locked decisions") and §20 (cut list) before proposing pgvector/embeddings, elkjs/auto-layout, a deployed Python service, a light theme, or spaced-repetition scheduling. These were deliberately killed, not overlooked.
- The grounding spine (`lib/grounding/*`) is deterministic on purpose: fuzzy quote matching + a numeric entailment floor, no LLM judge. Don't replace a threshold check with a model call to make something "smarter."
- Never write UI copy, API responses, or comments that call a grounded claim "verified." The only tier labels are quote located / paraphrase / unsupported (docs/PLAN-V1.md §4).
- Use the existing design tokens (`app/globals.css`, `tailwind.config.ts`): no new colors, no light theme.
- TypeScript strict mode is on; keep it passing rather than reaching for `any` or `@ts-ignore`.
- Match the existing comment style: none by default, one line only when it explains a non-obvious constraint or invariant (see any file under `lib/grounding/` for the tone).
- No em dashes (Unicode U+2014) anywhere in this project's own authored text: comments, docs, UI copy. Use a comma, colon, semicolon, or a double-hyphen (" -- ", this codebase's own convention throughout) instead. `npm run check:no-em-dashes` (`scripts/check-no-em-dashes.ts`) enforces this in CI.

## Ownership

Maintained by **Anay Dhawan** and **Yash Kewlani**.

`types/anchor.ts` and `fixtures/workspace.json` are a frozen contract: both `lib/*` and `components/*` code against that shape rather than against each other, so a change to either needs every consumer checked in the same PR. Run `grep -rl "types/anchor"` and `grep -rl "workspace.json"` before touching them, and call it out in the PR description.

## Commit messages

Focus on *why*, not *what*. The diff already shows what changed. No strict format is enforced, but keep the subject line under ~70 characters and use the body for rationale if it's not obvious from the diff alone.

## Reporting bugs / security issues

Regular bugs: open a GitHub issue. Security vulnerabilities: see [`SECURITY.md`](SECURITY.md), and please don't file those as public issues.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Be excellent to each other.
