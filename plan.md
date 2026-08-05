# Pepiros — V1 plan (read this first, no other doc needed)

Hackathon: Aug 7-19, 2026. Real build window: **Aug 10-17**, ship Aug 17, submit Aug 18. Team: Anay + Yash, both driving Claude Code. Working name **Pepiros** (domain TBD — `pepiros.com` is taken, buying an alt TLD or falling back to `quotae.com`/`vynqa.com`, doesn't block building).

## 1. One-liner + core loop

**Pepiros turns a research PDF into a living knowledge graph where every generated claim is bound to a located quote, and exposes that grounding to Claude as a callable service.**

What the user actually experiences, in order (this is the important part — pacing, not just features):

```
t=0ms     Upload a PDF or paste an arXiv/PMC/DOI URL
t<300ms   Skeleton graph appears: paper node + ghost pillars pulsing, before any AI has run
t<1s      Related Papers rail populates (Semantic Scholar API, no LLM — just a fetch)
t<2s      Metadata + archetype badge appear (Haiku, fast)
t~5-10s   Summary + top 3 pillars stream in — first real content the user reads
t~15-45s  Remaining generators fill in; citation-graph expansion (OpenAlex) becomes available
```

Default landing surface is a **doc-reader view** (summary top, related-papers rail on the right, PDF/quote inline), not the canvas. The canvas is reached via an "Explore graph" toggle. Canvas stays the demo centerpiece; the reader view is what makes a first-time user go "oh, this is simple" before they ever open the graph. This reorder is the fix for "the flow looked complicated" — nothing got cut, the cheap/fast stuff (API calls, regex, Haiku) just got moved in front of the slow stuff (Sonnet fan-out).

From there: open a node, read it beside the highlighted source PDF. Ask a question, the answer becomes a new node. Add more papers, get cross-paper edges (agrees/contradicts/extends/cites). Connect over MCP and let Claude verify its own claims against the source, live, on stage.

## 2. Locked decisions — do not reopen these

| Decision | Ruling |
|---|---|
| Scope | Full feature set (this doc + PLAN-V1.md), minus the cut list (§11). Kept full scope deliberately — see §9 schedule. |
| Anchor coordinates | `page.search_for(quote)` in PyMuPDF. Returns rect lists directly. Fallback: sliding window over `get_text("words")`. No span-extraction/reading-order layer, no pdf.js text layer for anchoring. |
| Deployed Python service | **Killed.** PyMuPDF and PaddleOCR-VL both run as local scripts, called from the ingest pipeline like `scripts/seed.ts`. No Fly.io, no second deploy target, no CORS. |
| pgvector/embeddings/BM25 | **Killed.** One paper is 8-20k tokens, whole paper goes in context, prompt-cached. Stable citation ids instead. |
| elkjs | **Killed.** Deterministic server-computed x/y (~40 lines). |
| React Flow | **Kept.** Pan/zoom/edge routing/virtualization for free. |
| "Verified" language | **Banned.** Badge says "quote located," never "verified." Inference is separately labelled. See §4. |
| Papers per workspace | 6, not 12. |
| Service layer | `lib/services/` extracted before MCP code (Aug 12-13). Both `app/api/*` and `mcp/server.ts` call only this layer. |

## 3. Architecture

```
Next.js 15 (App Router, TS, React 19)        -> Vercel
  app/api/*        HTTP surface for the UI
  mcp/server.ts    MCP surface for Claude
  lib/services/*   <- BOTH of the above call only this

Supabase: Postgres (no vector col), Storage (PDFs/figures), Auth, Realtime (job status)
scripts/seed.ts + scripts/parse.py: local PyMuPDF run, writes chunks/sections/figures/equations/refs/numerics
scripts/ocr_fallback.py: local PaddleOCR-VL run, fallback for scanned/table-heavy pages (NEW)
docker-compose.yml: GROBID container, dev-only, better reference parsing (NEW, optional)
```

Deps worth knowing: `@xyflow/react` (canvas), `ai` + `@ai-sdk/anthropic`, `zod` on every LLM output, `drizzle-orm`, `@supabase/supabase-js`, `p-queue` (generator fan-out), `@modelcontextprotocol/sdk`, `react-pdf`, `@tiptap/react`, `recharts` (NEW, for the numeric chart). Python (script-only, never deployed): `pymupdf pillow`, plus PaddleOCR-VL's inference deps.

Model routing: Haiku for archetype classification + metadata + the high-volume generator fan-out (prompt-cached on the paper block). Sonnet for the harder generators (methodology, statistical_validity, weaknesses, synthesis, contradiction pass) + chat + figure vision. **No LLM at all** for citation verification, anchor location, numeric checks, dedup — that's all deterministic code, which is the whole point (§4).

## 4. The grounding spine — this is the product, everything else is packaging

Every context block handed to a model carries ids it must reuse, never invent:

```
[C7  | Methods  | p.4] Participants were randomized 1:1 using a...
[F3  | Figure 2 | p.6] Kaplan-Meier survival curves showing...
[N12 | Results  | p.5] 34% (95% CI 21-45), p=0.003
```

The model cites `C7`; the app maps it to a chunk row and writes the evidence row. Verification is fully deterministic, no LLM judge:

```
for each claimed {ref, quote}:
  chunk = resolve(ref)
  if !chunk           -> drop, log hallucinated_ref
  score = token_set_ratio(normalize(quote), normalize(chunk.text))
  if score >= 0.92     -> quote_located
  elif score >= 0.75   -> paraphrase (badged, kept)
  else                 -> drop anchor, strip [^eN] from body_md
```

Plus an **entailment overlap floor**: every number/unit/comparator in a claim must also appear in the anchored span (checked against the `numerics` table). This catches the real failure mode — a genuine quote attached to a reversed or overstated conclusion.

**The honest framing, say this verbatim on stage:** fuzzy-matching a quote proves *quotation provenance*, not *entailment*. A model can attach a real Methods sentence to a wrong conclusion and score 1.0. So the badge always reads "quote located," claim and quote render adjacent so the reader adjudicates, and there are two tiers everywhere: quote-located (deterministic) vs. inference (model-generated).

Multi-span anchors are **required**, not optional — aggregate claims ("three of four trials used open-label dosing") have no single contiguous source sentence. A single-span-only verifier silently degrades into a highlighter.

## 5. Data model (condensed — full column list in `docs/PLAN-V1.md` §5)

`workspaces -> papers -> sections -> chunks`, plus `figures`, `numerics`, `references_`. Graph layer: `nodes` (types: `paper`/`pillar`/`leaf`/`thread`/`synthesis`), `edges` (kinds: `contains`/`relates`/`derived_from`/`agrees`/`contradicts`/`extends`/`shares_method`/`cites`), `evidence` (owns `quote_located`/`match_score`/`numeric_ok`). Plus `conversations`/`messages`, `flashcards`/`quizzes`, `jobs`/`job_events`, `share_tokens`, `mcp_tokens`.

Invariants enforced in code and tests: an inline `[^e1]` with no matching evidence row is a render error (CI-caught). `contains` edges form a strict tree. Deleting a paper cascades its nodes/chunks but marks cross-paper synthesis nodes `stale` rather than deleting them. A `contradicts` edge with one-sided evidence is **rejected at write time**.

## 6. New features this pass (on top of the original plan) — all cheap, all free APIs

1. **Related Papers rail** — Semantic Scholar API (free, no key, has TL;DRs built in). Fires on ingest, populates in <1s, no LLM. Owns: `lib/services/related.ts`, `app/api/related/route.ts`, `components/related/RelatedPapersRail.tsx`.
2. **Citation graph expansion beyond the workspace** — OpenAlex API (free, no key). "What cites this / what this cites," rendered as dimmed ghost nodes at the canvas edge, one-click "Add to workspace" ingests it for real. Turns the product from a closed 6-paper box into an open citation explorer. Owns: `lib/services/citationExpand.ts`, `app/api/expand/route.ts`, `components/canvas/GhostCitationNode.tsx`.
3. **PaddleOCR-VL fallback** — Baidu's 0.9B doc VLM, SOTA on tables/formulas/scanned pages (96%+ on OmniDocBench). PyMuPDF stays primary (fast, what anchoring depends on); this fires only when the zero-extractable-text check hits or a page is table/formula-dense. Local script, same pattern as `seed.ts`, not a deployed service. Owns: `scripts/ocr_fallback.py`.
4. **GROBID for references (optional)** — `docker run grobid/grobid` locally. Swaps the regex reference parser for GROBID's ML model (.87-.90 F1 on real benchmarks), meaningfully better `cites`-edge accuracy for near-zero code. Dev-only, Java, never deployed.
5. **Numeric comparison chart** — the `numerics` table already exists. One Recharts panel per pillar (effect sizes, CIs, p-values), zero new backend work. Owns: `components/viz/NumericChart.tsx`.
6. **arXiv LaTeX-source fast path** — for arXiv URLs, pull the `.tar.gz` source instead of parsing the PDF, perfect equation/reference fidelity. Nice-to-have if the demo corpus includes an arXiv paper.

## 7. MCP layer (the feature that reframes the whole project)

Pepiros stops being a website and becomes grounding infrastructure any Claude conversation can call. 12 tools, notably `search_paper` (returns `[C7|Methods|p.4]` chunks), `verify_claim` (deterministic, re-verifies server-side — **never trust a client-asserted `quote_located`**), `create_node` (also re-verifies server-side), `find_contradictions`. Every result carries the verbatim quote, page, and a deep link back into the app — Claude can't see the canvas, so text + link is the whole interface.

**The demo beat:** in Claude, no Pepiros tab open. "Summarize this RCT's primary outcome." Claude answers. Then: **"now verify every claim you just made."** Claude calls `verify_claim` on its own sentences, one comes back `unsupported`, Claude says so out loud. Then `create_node` writes the audited result into the graph, click the link, canvas opens with the new node already anchored and highlighted.

Ship stdio first (`npx pepiros-mcp`, ~20 lines once tools exist), OAuth is the stretch — decide by Aug 16. If OAuth slips, demo through Claude Code instead of claude.ai, same beat, one fewer setup step.

## 8. Two-person split

Freeze `types/anchor.ts` + `fixtures/workspace.json` together, hour one — everything after is parallel because both sides code against the fixture, not against each other.

- **Anay** owns `lib/`, `scripts/`, `mcp/`, `app/api/`. The atom: parse pipeline, anchoring, verifier, entailment floor, generators, planner, synthesis, MCP, `related.ts`/`citationExpand.ts`.
- **Yash** owns `components/` and `app/(app)/` pages. Canvas, node states, inspector, reader, highlight layer, chat dock, learn, reading path, outline, audit view, `RelatedPapersRail.tsx`, `NumericChart.tsx`, design tokens, a11y.
- Shared: `types/` and `fixtures/`. Changes to either need a heads-up. Nothing else is co-owned.

## 9. Schedule

See `docs/PLAN-V1.md` §17 for the full day-by-day table (Aug 10-18) — real capacity ~16-18h against a fuller scope, kept intentionally (Anay's call, Yash covering more hours). Key fixed dates: **Fri Aug 14 checkpoint** — is parse-to-locate-to-verify-to-highlight working end to end? If not, fire the slip order that night. **Mon Aug 17 = ship** (MCP tools, seed 3 papers, plant one misattribution, measure drop rate, rehearse). **Tue Aug 18 = submit.**

**Slip order if time runs out** (compresses first, in this order): export, quiz, flashcards, reading path rail, share link, reverse anchor lookup, arXiv fast path, GROBID, then the generator count down to the 8 that carry the demo. **Never cut:** the anchor spine, the verifier, the highlight, the contradiction diff, the MCP `verify_claim` tool, the Related Papers rail (cheapest new feature, highest visible payoff).

## 10. Design system (one line — full tokens in PLAN-V1.md §14)

"Lab notebook at night." Dark-first, low-chroma surfaces, paper-white reading surfaces on dark chrome, pillar colour as a structural system (edges/borders/chips all share it), real typographic hierarchy (serif for prose, grotesque for UI, mono for ids). Full CSS token block, motion spec, and voice guide: `docs/PLAN-V1.md` §14.

## 11. Cut list — don't rebuild these, they were killed on purpose

Research Mentor (replaced by the deterministic reading path), SM-2 spaced repetition (flashcards stay, scheduling doesn't), adaptive quiz difficulty, `mindmap`/`notes`/`takeaways`/`strengths` generators (redundant with others), version-history diff UI (the table stays, the viewer doesn't), light theme, minimap, pgvector/embeddings/BM25, elkjs, a deployed FastAPI service, `role="application"` on the canvas (breaks screen readers).

---

**Full detail on anything condensed above** (data model columns, design tokens, demo script, risk table, addon rankings) lives in `docs/PLAN-V1.md` — that file is still canonical, this one is the fast-start version.
