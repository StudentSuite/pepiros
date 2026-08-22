# Pepiros: shared context (read this to confirm Anay/Yash are aligned)

**Purpose of this file:** single standardized source both of us read before touching code or making product calls. This is the ultimate source of truth for Pepiros's final-product context — if something here doesn't match what's in your head, say so before we build further apart. Last assembled/corrected: 2026-08-22, from `plan.md`, `CLAUDE.md`, `README.md`, `lib/db/schema.ts`, `lib/data/adapter.ts`, `lib/services/catalogIndexer.ts`, `components/site/Hero.tsx`, `app/layout.tsx`, `app/opengraph-image.png`, and a direct positioning confirmation from Anay on this date (see §2).

Every claim below is tagged **[BUILT]**, **[BUILT, seed-mode]**, or **[TARGET]** — verified directly against the current codebase, not assumed. **[BUILT, seed-mode]** means real routes, real auth gating, and a real backend schema/interface already exist, but the live deployment currently serves deterministic fake data because a backend flag isn't flipped yet. Don't read it as "not built."

---

## 1. What it is

**Pepiros = Substack + Reddit + JSTOR + GitHub, for researchers.**

Four surfaces on one grounded core:
- **GitHub, for your research** — a researcher's profile is their public dev-profile analog: papers they've uploaded/authored, contributions, editable the same way a GitHub profile is.
- **Reddit, for discovery** — a feed of papers and posts, likeable, commentable, arguable.
- **JSTOR, for search** — a real searchable index of research papers, both your own library and the open-access catalog.
- **Substack + Reddit, for writing** — publish write-ups and posts about papers, not just upload them.

What actually happens when you use it: upload a PDF or paste an arXiv/PMC/DOI link. Pepiros extracts structure, generates a summary and thematic "pillars," and backs every generated claim with a quote it can point at in the source PDF (page, rect, match score). That grounded claim graph is the atomic unit everything else (profile, feed, search, posts, MCP) is built on top of.

## 2. Positioning — confirmed 2026-08-22, supersedes `plan.md` §22.3

`plan.md` §22.3 currently locks "grounding-first, platform ambition never the headline," written when the platform layer was a stretch add-on to a single-workspace grounding tool. **That lock is superseded.** The full S+R+J+G-for-researchers vision in §1 is now the real positioning, confirmed directly by Anay, not just a documentation drift to flag.

**What does NOT change:** the grounding spine (§4 below) stays the actual product underneath all four surfaces — a profile, a feed post, a comment, all inherit their trustworthiness from the same verifier. What changes is that the platform ambition is now allowed to be the headline, not something apologized for underneath a research tool.

**Follow-up needed, not done in this pass:** `plan.md` §22.3's text itself is now stale and should get an editorial pass once Yash has seen this file and confirmed the same read. Don't silently rewrite `plan.md` — that's a shared locked-decisions doc, both of you should sign off on the edit together.

## 3. Canonical copy & taglines — exact live strings, don't improvise a new one

Multiple taglines exist across the repo. This is the map of which ones are actually live right now vs. historical/pitch-only, so nobody grabs the wrong one by accident.

**On-page hero tagline — LIVE, `components/site/Hero.tsx`, directly under the "PEPIROS" wordmark on the homepage:**
> "Every claim, one click from its source."

The code's own comment calls this "the locked tagline (plan.md section 10 / design/DIRECTIONS.md's brand kit)."

**Root SEO/OG meta description — LIVE, `app/layout.tsx`, used as the `<meta description>` and `og:description`/`twitter:description` on every single page:**
> "A publishing platform for researchers, with a summariser you can check: publish the papers you read, and every claim stays bound to the sentence it came from."

**Social-share card image text — LIVE, `app/opengraph-image.png` + `app/twitter-image.png` (static PNGs, verified by opening the actual image file):**
> "PEPIROS" / "Be the source."

**⚠️ Confirmed live and unresolved as of 2026-08-22 — this is not a stale note, it's still true right now:** the on-page tagline and the social-share-card tagline are two different lines, both shipping simultaneously. Someone who clicks a shared link sees "Be the source." in the link preview, then lands on a page whose hero says "Every claim, one click from its source." **Pick one before writing any new copy that needs a tagline** — don't create a third variant to add to the pile. Whoever decides should update the losing surface's source (`Hero.tsx` or regenerate the OG image) in the same pass, not just pick one for new copy and leave the mismatch live.

**Elevator pitches — Devpost/hackathon-submission copy only, `SUBMISSION.md`. NOT live anywhere on the actual site. Don't pull from here for product UI without deciding to promote one first:**
- "A place to read, publish and argue about research papers where every claim carries the exact sentence it came from. Drop in any paper and Pepiros maps what it says."
- Alt: "Reddit and Substack for research papers, except nothing in the feed can make a claim without showing you the line it came from."
- Alt: "Every claim, one click from its source. Pepiros indexes papers into claim maps, then lets people read, publish and argue on top of them."

**The current positioning framing to use for anything new (§2):** Substack + Reddit + JSTOR + GitHub, for researchers.

## 4. The grounding spine (this is the actual product underneath all four surfaces)

Deterministic, no LLM judge:

```
for each claimed {ref, quote}:
  chunk = resolve(ref)                # stable citation id, not a vector lookup
  if !chunk           -> drop, log hallucinated_ref
  score = token_set_ratio(quote, chunk.text)
  if   score >= 0.92  -> quote located
  elif score >= 0.75  -> paraphrase (badged, kept)
  else                -> drop anchor, strip [^eN] from prose
```

Plus an **entailment overlap floor**: every number/unit/comparator in a claim must also appear in the anchored chunk's numerics. Catches a real quote attached to an overstated conclusion, which string-matching alone scores 1.0.

**"Verified" is a banned word everywhere** — UI copy, API responses, code comments. Only tier labels: "quote located" / "paraphrase" / "unsupported". A fuzzy-matched quote proves *quotation provenance*, not *entailment* — claim and quote render adjacent so the reader adjudicates. This is the one idea that must not drift between us; everything else, including how social the product gets, is negotiable.

**Confirmed 2026-08-22: paper-level likes do NOT conflict with the locked "no voting on claims" rule.** The locked rule (SUBMISSION.md: "nothing gets truer because more people agreed") is scoped to individual claim nodes — a claim's grounding tier is never a popularity contest, full stop. A **post/paper** getting liked is ordinary social engagement on the object as a whole, same as a GitHub repo getting stars. The two are different layers and both can be true at once: `post.likes: 340` and `claim_node.grounding_tier: quote_located` are unrelated numbers.

## 5. Ownership split

- **Anay** owns `lib/`, `scripts/`, `mcp/`, `app/api/`: parse pipeline, anchoring, verifier, entailment floor, generators, planner, synthesis, MCP layer.
- **Yash** owns `components/` and `app/(app)/` pages: canvas, node states, inspector, reader, highlight layer, chat dock, learn, reading path, outline, audit view, design tokens, a11y.
- **Shared, needs a heads-up before either side edits:** `types/anchor.ts` and `fixtures/workspace.json` — the frozen contract both `lib/*` and `components/*` code against. Check `grep -rl "types/anchor"` and `grep -rl "workspace.json"` before changing either.
- **Note:** the S+R+J+G platform layer (§8) is wide surface area that doesn't fit the old two-person split cleanly (profile/feed/search all touch both data model and UI). Worth a real re-split conversation once you start building it out, not an assumption that it falls under the old boundaries by default.

## 6. Tech stack (current, not the original hackathon plan)

```
Next.js 16 (App Router, TS strict, React 19)   -> Vercel
Postgres on Supabase (real migrations, no vector column), Storage, Auth, Realtime
Drizzle ORM for the grounding-domain schema (lib/db/schema.ts)
Raw SQL migrations for the platform/social domain (supabase/migrations/0001_platform.sql onward) -- a
  separate migration track from Drizzle, gated behind PEPIROS_PLATFORM_BACKEND=supabase, see §8
Groq (primary) + Featherless (fallback) for inference -- NOT Anthropic, pivoted early
OpenRouter (free vision-capable model) for figure reading -- neither Groq nor Featherless has vision
PyMuPDF + Pix2Text: local scripts only, never deployed (Vercel has no Python runtime)
React Flow (canvas), zustand, zod on every LLM output, p-queue (generator fan-out)
@modelcontextprotocol/sdk, react-pdf, recharts, tiptap
shadcn/ui primitives (vendored under components/shadcn/) for dashboard-style UI [BUILT]
Semantic Scholar API + OpenAlex API (free, no key) for related-papers + citation expansion
Vitest: 318 tests / 36 files, CI runs against a real ephemeral Postgres on every push
```

`app/api/*` and `mcp/tools/*` both call only `lib/services/*`, never `lib/grounding/*` or `lib/db/*` directly — this is what keeps the website and the MCP server from ever telling a user two different things about the same paper.

**`plan.md` §3's architecture diagram and dependency list still mention `@ai-sdk/anthropic`.** Stale — Anthropic was removed from the stack entirely, not just unblocked by getting a key. Doc-hygiene TODO, not a real disagreement: fix on the same pass as the §2 edit above.

## 7. Locked decisions — do not reopen without both of us signing off

| Decision | Ruling |
|---|---|
| Anchor coordinates | `page.search_for(quote)` in PyMuPDF, returns rects directly. Fallback: sliding window over `get_text("words")`. No pdf.js text-layer anchoring. |
| Deployed Python service | Killed. PyMuPDF/Pix2Text/PaddleOCR run as local scripts, called from the ingest pipeline. No second deploy target. |
| pgvector / embeddings / BM25 | Killed. One paper fits in context (8-20k tokens), prompt-cached. Stable citation ids instead of vector search. |
| elkjs / force layout | Killed. Deterministic server-computed x/y in `lib/layout/computeLayout()`, called once at the data seam so API, MCP, and client store see identical positions. Never measure the DOM to lay out. |
| React Flow | Kept — pan/zoom/edge routing/virtualization for free. |
| "Verified" language | Banned, see §4. |
| Voting scope | Claims never get votes (grounding tier is never popularity-based). Posts/papers can get likes — see §4. Confirmed 2026-08-22, not a conflict. Dislikes are not designed anywhere yet — see §8. |
| Multi-span anchors | Required, not optional. Aggregate claims ("3 of 4 trials used X") have no single source sentence; `Evidence.anchor.spans` is always an array. |
| Model routing | Fast tier for classification/high-volume fan-out, strong tier for hard generators (methodology, statistical_validity, weaknesses, synthesis) + chat + figure vision. No LLM at all for citation verification, anchor location, numeric checks, dedup — deterministic code, that's the whole point. |
| Cut list, don't rebuild | Research Mentor (replaced by deterministic reading path), SM-2 spaced repetition / adaptive quiz difficulty, `mindmap`/`notes`/`takeaways`/`strengths` generators (redundant), version-history diff UI (table stays, viewer doesn't), minimap, `role="application"` on the canvas (breaks screen readers). |
| Client-asserted evidence | Never trusted. MCP `verify_claim`/`create_node` and `/api/verify` always re-run `lib/services/verify.ts` server-side against the corpus. |
| MCP client scope | Claude-first now; multi-client MCP support is a confirmed later target, not Claude-exclusive forever. Confirmed 2026-08-22. Don't design anything MCP-adjacent as single-caller-only going forward. |
| Mindmap mechanism | [Markmap](https://github.com/gera2ld/markmap) (`markmap-lib`/`markmap-view`, pure JS). Confirmed 2026-08-22. See §8 for full detail. |

**Note on the cut list and "mindmap":** the old cut list bans a `mindmap` *generator type* (redundant with the existing pillar/node generators). §8 below's auto-mindmap feature is a different thing — it renders the existing claim-graph output via Markmap, not a new generator type.

## 8. Full platform vision — status corrected 2026-08-22 against real code, not assumed

Everything in this section was described directly by Anay on 2026-08-22. Tagged against what's actually in `lib/db/schema.ts`, `lib/data/adapter.ts`, and the real routes as of this date.

**The platform/social domain has its own real backend track, currently in seed mode.** `lib/data/adapter.ts` explicitly documents two separate Supabase domains: the **grounding domain** (papers, chunks, nodes, evidence — in `lib/db/schema.ts` via Drizzle, live) and the **platform domain** (profiles, posts, post_metrics, comments, likes, follows — specified in `supabase/migrations/0001_platform.sql` onward, a separate raw-SQL migration track). The platform domain only activates when `PEPIROS_PLATFORM_BACKEND=supabase` is set AND real Supabase credentials are configured; until then, `getAdapter()` transparently falls back to a **seed adapter** that returns deterministic fake data (e.g. `getLikeState()` always returns `{count: 0, liked: false}`, `setLiked()` no-ops) rather than crashing or silently losing writes. This is a deliberate, documented safety fallback, not a bug — but it means every platform-layer page below is real UI wired to a real interface, running on fake numbers until that flag flips.

**Profile (GitHub analog)** — [BUILT, seed-mode]
- `app/(platform)/u/[username]/page.tsx` is a real public profile page: avatar, bio, papers posted, follower count, a real `FollowButton`. For a real signed-up account it calls `adapter.getFollowState()` for a genuine follower count and follow/unfollow state. For the 8 illustrative catalog personas (`priyasub`, `jonasw`, `hanak`, `tferreira`, `amarao`, `weiz`, `eroux`, plus `guest`) hardcoded in the page's `DISPLAY` map, it shows an explicitly-labelled fake follower count (`100 + papers.length * 37`) since those aren't real accounts.
- Editable like a GitHub profile: not yet confirmed — check `app/(app)/settings/profile/page.tsx` for what's actually editable before assuming full parity.

**Feed (Reddit analog)** — [TARGET, UI shell only over fake data]
- `app/(platform)/discover/page.tsx` renders `FeedClient` over the full catalog list, no ranking, no personalization. Its "engagement" numbers come from `seedCatalogStats(p.id, p.year)` — deterministic fake stats derived from the paper's own id/year (code comment: "so it is identical on the server and on the client and does not reshuffle between renders"), a different (and more purely cosmetic) fake-data path than the platform-domain seed adapter above. Real likes/follows would need this page rewired to read real data once the platform backend is live.

**Search (JSTOR analog)** — [TARGET]
- No dedicated search route/service found. The catalog (`lib/data/papers.ts`) is a static checked-in list, browsable via `/discover`, not full-text or metadata search.

**Posts (Substack + Reddit analog)** — [BUILT, seed-mode]
- `app/(app)/posts/page.tsx` ("My posts," real auth-gated) lists a real signed-in user's posts via `adapter.listPosts()`, with delete. `app/(app)/comments/page.tsx` is a real per-account comment inbox (read/unread, links back to the claim/post), via `adapter.listComments()`. Both are real routes with real session gating; in seed mode the underlying posts/comments are generated by `seedComments()` rather than read from a real `posts`/`comments` table, but the table shape is already specified in `0001_platform.sql`.

**Likes** — [BUILT, seed-mode] · **Dislikes** — [TARGET, doesn't exist anywhere]
- `lib/data/adapter.ts` has a real `LikeState { count, liked }` interface and `getLikeState()`/`setLiked()` methods, backed by the platform migration. In seed mode these are inert (`{count: 0, liked: false}`, write no-ops). **There is no dislike concept anywhere in the codebase** — no interface field, no migration reference, no UI. If dislikes are wanted, that's net-new schema + interface + UI work, not a threshold or a flag flip like likes/posts/comments are.

**Account analytics (viewer analytics, followers)** — [BUILT, seed-mode] (public-facing) + [BUILT, real] (admin-side)
- `app/(app)/analytics/page.tsx` is real, auth-gated, calls `adapter.getReach(profile.id, range)` for `7d`/`30d`/`90d`/`all` reach summaries plus the real comments list. In seed mode, `getReach()` is generated by `seedReach()`, same fallback pattern as above.
- Separately, real **admin-side** analytics already exist independent of the platform-backend flag: onboarding drop-off tracking, a sortable response table. That one is genuinely live today, not seed-gated the same way.

**MCP server** — [BUILT]
- All 12 tools live over stdio and a real remote streamable-HTTP transport with full OAuth (dynamic client registration, PKCE, single-use codes), workspace-token-pinned and rate-limited. `verify_claim`/`create_node` re-verify server-side, never trust a caller's assertion.
- Claude-first now, multi-client later — see §7's locked-decisions table.

**Paper metadata** — [BUILT]
- Authors, publication year, archetype, licence, section/chunk/figure/equation/numeric extraction all real (§10 below has the full working list).

**Auto-indexing → mindmap** — [PARTIALLY BUILT / TARGET, mechanism confirmed 2026-08-22]
- **What's real today:** `lib/services/catalogIndexer.ts` + `app/api/cron/index-catalog` run a weekly (Monday 04:00) batch that turns **every open-access catalog/library paper** into a real claim graph via the normal parse → classify → generate → verify pipeline. Batch size 3, idempotent (`indexed_catalog` table tracks what's already done), CRON_SECRET-gated. This is NOT gated by likes — it runs on the whole catalog on a schedule.
- **Target, confirmed 2026-08-22:** two trigger paths should exist — (1) **individual (user-uploaded, non-catalog) papers that cross 20 likes** get auto-converted to a mindmap, on top of (2) the existing all-open-catalog-papers-on-schedule behavior, which stays as-is. This depends on real like counts, i.e. on the platform backend actually being live (see above), not the seed fallback.
- **Mechanism, confirmed 2026-08-22: [Markmap](https://github.com/gera2ld/markmap) (`markmap-lib`/`markmap-view`).** Pure JS/npm, renders a markdown outline as an interactive SVG mindmap in the browser — no Python, no second deploy target, doesn't violate the locked "no deployed Python service" rule (§7). The mindmap is a **rendering layer over Pepiros's own already-verified pillar/node graph** (exported as a markdown outline), not a second independent AI-extraction pipeline. This deliberately avoids what the old cut list already banned a `mindmap` *generator type* for (redundant re-extraction) — Markmap only visualizes data the grounding spine already produced and verified. Ruled out: Dicklesworthstone/mindmap-generator and similar Python+LLM tools (can't run in Vercel's production runtime per the existing PyMuPDF constraint, and would duplicate the existing generator pipeline instead of reusing its verified output). Not yet built — this is the target mechanism, no code exists for the like-gated trigger or the Markmap integration yet.

**"Open" account** — [TARGET, confirmed as a real build target 2026-08-22]
- A visible public profile/account, owned by no one, holding all open-license (arXiv/PMC-OA/CC) library papers, linkable for free — like a GitHub org page for the catalog.
- **Current reality:** the *backend* pattern already exists — catalog papers are deliberately unowned (`lib/services/catalogIndexer.ts` line ~96, "Unowned on purpose (issue #231): the catalog is public library content"). The `/u/[username]` route mechanism (above) could serve this once a reserved username/profile row is created, but that row/route doesn't exist yet — no `open` entry in the `DISPLAY` map or a real unowned profile account. New work: a route/username-reservation decision plus wiring the catalog into that profile's "papers posted" list, not a data migration.

**UI/UX theme** — not detailed in this doc by Anay's request (2026-08-22): current build uses the locked "Editorial Paper" design system (§9 below documents it as still current). A separate theme-exploration pass is planned but intentionally not specified here yet.

## 9. Design system (current, as shipped — see note above on future changes)

"Editorial Paper" (Are.na x Instapaper/NYT Reader), locked 2026-08-10, confirmed by both of us. Dark-first "lab notebook at night" base, warm paper-texture reading surfaces on dark chrome. Pillar colour is structural (edges/borders/chips all pull from one `pillarColor()` function, not decorative per-component choices). Serif for reading prose, grotesque/sans for UI chrome, mono for citation ids. Palette: Stone `#B8B2A4`, Clay `#C4A78A`, Sage `#7D8A73`, Dusk `#6E6AA7`, Rose `#B46A6A`, Ochre `#D4B26A`, Teal `#5F8D86`. Full tokens: `app/globals.css` / `tailwind.config.ts`. Light theme is on the cut list — don't build it under this system. (Taglines are covered separately in §3 — don't restate them here.)

## 10. What's actually live right now (per `README.md` + direct code checks, most current source)

**Working [BUILT]:**
- Grounding spine, all grounding-domain tables migrated (Drizzle), real CI Postgres
- Canvas (5 node types, ghost citation nodes), reader, outline, audit, learn, share views
- Related-papers rail (Semantic Scholar) + citation expansion (OpenAlex), typed status, no fabricated fallback data
- 19 of ~22 generators, including `equations` (Pix2Text -> LaTeX) and `figures` (vision-model pass)
- All 12 MCP tools live, both stdio and a real remote streamable-HTTP transport with full OAuth, rate-limited and workspace-token-pinned
- Grounded chat with refusal path and citation re-verification
- Real auth: Google + password, server-revocable sessions, sign-out-everywhere, guest mode with an honest "not saved" banner
- Upload/ingest pipeline: size/magic-byte/page-cap/duplicate checks, 9-stage SSE progress, real parse -> classify -> generate -> re-verify path
- Cross-paper synthesis: 4 of 6 node types (Consensus, Contradictions, Timeline, Methodological Divergence) — Dataset Overlap and Open Questions still need signals the pipeline doesn't extract yet
- Node editing (re-verifies citations on edit, version history), export (Markdown/BibTeX)
- Weekly catalog-indexing cron (see §8 above for exact behavior)
- Platform/social routes (profile, posts, comments, likes, follows, analytics) — real UI + real interfaces, seed-mode by default, see §8
- Admin-side layer: homepage, onboarding flow with drop-off tracking, admin dashboards, workspace ownership scoping, rate limiting on public routes, per-paper licence recording

**Not built yet [TARGET]:**
- OCR fallback (`scripts/ocr_fallback.py`) for scanned/table-heavy pages — currently fails loudly instead of recovering text
- `scripts/seed.ts` — bulk corpus loader, still a stub
- `concept_links` generator (cross-paper context a single-paper generator can't carry — synthesis's `relates` classification covers the same ground a different way)
- Dataset Overlap / Open Questions synthesis node types
- Session refresh (sessions expire at 7 days, no silent renewal — revocation exists, refresh doesn't)
- Drop-rate measurement (`evals/`, `scripts/measure-drop-rate.ts`)
- Real search (JSTOR piece, §8)
- Real feed ranking/personalization (Reddit piece, §8 — the route exists, the ranking doesn't)
- Dislikes (§8 — genuinely absent, unlike likes/posts/comments/follows which are seed-mode-built)
- The "Open" public account (§8)
- The 20-like Markmap auto-indexing trigger (§8)
- Flipping the platform backend live (`PEPIROS_PLATFORM_BACKEND=supabase` + applying `0001_platform.sql`) — the single flag/migration that turns most of §8's [BUILT, seed-mode] items into fully real data

**Standing constraint:** PDF ingest only runs locally (`npm run dev`) — Vercel's Node runtime has no Python, so the hosted deploy serves the pre-ingested demo/catalog content but returns an honest 501 on a real upload.

## 11. Doc-hygiene TODOs (stale docs, not real disagreements)

- `CLAUDE.md`'s "Current data seam" section still says no live Supabase project is provisioned and everything resolves through a fixture. Stale for the grounding domain — Supabase is live and migrated there. Needs a pass so `CLAUDE.md` stops contradicting itself, and should now also explain the separate platform-domain seed/live split from §8.
- `plan.md` §3's dependency list still mentions `@ai-sdk/anthropic` (removed from the stack, see §6).
- `plan.md` §22.3's positioning lock needs an editorial update per §2 above — do this together with Yash, not unilaterally.
- The tagline split in §3 needs a decision, then a code change to whichever surface loses.

## 12. Canonical docs (in priority order, don't restate their content elsewhere)

1. `plan.md` — fast-start product/architecture spec, locked decisions, cut list. Read this first for any new work. (Pending the §2/§11 updates above.)
2. `docs/PLAN-V1.md` — full detail plan.md condenses: data model columns, design tokens, demo script, risk table.
3. `README.md` — current build status, quick start, MCP usage. Reliable for the grounding domain; check §8 above for the platform-domain nuance it doesn't fully capture yet.
4. `CLAUDE.md` — harness/dev conventions only (commands, gotchas). Partially stale on the Supabase point, see §11.
5. This file — shared alignment snapshot, the ultimate source of truth for product context. If it goes stale, fix it here, don't fork a second version.

---

**Anay: this reflects your 2026-08-22 vision + verified code state, including the corrected §8 platform-layer status and the §3 tagline map. Send to Yash once you've picked which tagline wins.**
