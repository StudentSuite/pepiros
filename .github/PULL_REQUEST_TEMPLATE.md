<!-- Keep PRs focused. Per plan.md §8 the rough ownership split is lib//scripts//mcp//app/api (Anay)
     vs components//app/(app) (Yash), with types/ and fixtures/ shared. Flag cross-cutting changes here. -->

## What and why
<!-- What does this change and why? Link any related issue: Closes #123 -->

## Type
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor / chore

## Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Touches `types/` or `fixtures/`? Both owners have been given a heads-up (plan.md §8)
- [ ] No claim, badge, API response, or comment calls anything "verified" (plan.md §4)
- [ ] CHANGELOG updated under `## [Unreleased]` for user-facing changes
- [ ] No secrets, credentials, or personal paths committed
