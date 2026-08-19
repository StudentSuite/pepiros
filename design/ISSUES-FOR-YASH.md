# Issues to file

Drafted from `design/COPY-CRITIQUE.md` §6, then reconciled against the
2026-08-15 redesign. Each is a place where the honest fix is to build the thing
rather than soften the sentence.

Four of the original eighteen were resolved during the redesign and are listed
separately at the bottom, so nobody picks up work that is already done.

Ordering is by what breaks the demo first, not by size.

---

## P0: visible in a two-minute demo

### `feat(ingest): wire the PDF parse pipeline behind POST /api/ingest`
Upload validates and queues, but nothing parses. `lib/services/ingest.ts` is a
three-line TODO and `scripts/parse.py` is a stub, so every "drop a PDF and we
build the graph" claim on the site is currently unbacked. This is the single
biggest gap between what the product says and what it does.

### `feat(auth): make signup create an account`
`/signup` validates input, creates nothing, and pushes to an auth-gated route,
so a new user is bounced straight back to `/login`. Sign-in now works against a
real endpoint with a signed session cookie, so this is the only half of the auth
flow still missing.

### `feat(chat): wire Promote to node through create_node`
`PromoteButton` logs to the console and then renders "Promoted to graph". A
false success state is bad anywhere; in a product whose entire pitch is not
asserting things it cannot support, it is the worst possible bug to be caught on.

### `feat(share): resolve share tokens instead of always loading ws-1`
`ShareClient` ignores the token in the URL and unconditionally loads the fixture
workspace, while the UI prints the token back to the viewer. That reads as a
security claim, not just a copy defect: any share link opens the same data.

---

## P1: MCP, the differentiator

### `fix(mcp): register the four missing workspace and ingest tools`
`/mcp` documents `list_workspaces`, `create_workspace`, `add_paper`, and
`get_job`. `mcp/tools/index.ts` registers none of them. The page has been
corrected to say eight and to label these four as planned, so the copy is no
longer wrong, but the tools are still missing.

### `feat(mcp): publish a runnable install path for the MCP server`
`npx pepiros-mcp` cannot resolve: `package.json` is `private: true` with no
`bin` field. The install copy now points at `npm run mcp:stdio`, which works
from a clone but not for anyone who has not cloned the repo.

### `feat(settings): back MCP tokens with real issuance and verification`
Generated tokens are `Math.random()` strings held in React state, and the MCP
server has no auth layer that would accept one. `lib/services/mcpAuth.ts` and
the `mcp_tokens` table exist, so the pieces are there but unconnected.

### `chore(mcp): generate the tool list from one source`
The count was wrong in three places at three different values. It is corrected
now, but it is still three hand-maintained lists (`/mcp`, `llms.txt`, the server
registry), so it will drift again. Generate the docs from the registry.

---

## P2: features the site describes

### `feat(synthesis): implement the contradiction synthesis pass`
`lib/services/synthesis.ts` is two TODO lines, so `find_contradictions` only
reads pre-existing edges from the fixture and nothing ever writes new ones. The
cross-paper story has no engine behind it.

### `feat(export): implement GET /api/export for markdown and BibTeX`
The route returns 501 from `notImplemented`, and there is no export affordance
in the UI to match the capability the plan describes.

### `feat(learn): generate quiz questions and flashcards from real nodes`
`QuizRunner` ships four hardcoded questions naming fixture authors and citation
ids, which will be nonsense for any real upload. Flashcards are synthesised at
render with no persistence.

### `feat(chat): derive suggested questions from the loaded paper`
The four suggestions in `ChatDock` are hardcoded to the two fixture papers.

### `feat(ingest): stream real pacing progress to the upload view`
`PacingStrip` publishes five specific latency figures (`<300ms` through
`~15-45s`) as observed behaviour, on two pages, with no pipeline behind them to
have measured. Either instrument the real pipeline and stream actual progress,
or stop stating numbers.

### `feat(app): replace mock reading position and analytics with real data`
`/home`'s Continue reading card is hardcoded to the fixture workspace, and the
whole platform layer runs on the deterministic seed generator. The Supabase
adapter and schema are written and the guest auth user exists; what is missing
is real per-user data and flipping `PEPIROS_PLATFORM_BACKEND`.

### `feat(platform): implement publish, follow, and comments for real`
`/paper/[slug]` and `/u/[username]` still read `lib/mock/*`, including four
fabricated named comments rendered as if they were real discussion. The tables
(`comments`, `likes`, `follows`) exist in `0001_platform.sql` and are unused.

### `feat(auth): implement password reset, or remove the route`
`/reset-password` tells the user a link is on its way and sends no email.

---

## Resolved during the 2026-08-15 redesign, do not file

- **Demo workspace unreachable.** All four "Try the demo workspace" CTAs
  pointed at `/workspaces`, which middleware protects, so the primary hero
  button bounced signed-out visitors to `/login`. They now route through
  `/login?next=/w/ws-1`, and the login page surfaces the guest credentials.
- **Missing legal and trust pages.** `/privacy`, `/terms`, `/security`, and
  `/status` now exist, as do `/docs`, `/faq`, `/roadmap`, and `/changelog`.
  `/contact` no longer points web visitors at a `SECURITY.md` filename.
- **`/discover` backed by invented papers.** The feed now reads a catalogue of
  24 real open-access papers with working source links, and was rebuilt as a
  ranked feed. Per-user publishing is still outstanding, tracked above.
- **Internal doc references leaking into the UI.** The `plan.md §5 invariant`
  strings in `AuditClient` and `NodeInspector`, and the raw `GROQ_API_KEY`
  setup instruction in `ChatDock`, have been removed.
