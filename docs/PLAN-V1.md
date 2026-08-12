<!--
  VENDORED COPY. The canonical original lives outside this repo, in Anay's private
  planning repo. It was copied in on 2026-08-05 because roughly thirty `TODO` comments
  across lib/, mcp/, scripts/, and app/api/ cite "PLAN-V1.md §N" for the detail they
  need to be implemented, and that file was not reachable from a clone.

  Naming: this document predates the rename. "ResearchSumm" throughout is the old
  working name for what is now Pepiros. plan.md is the fast-start version of this
  document and is the one to read first; this is the long-form reference behind it.

  BEFORE THIS REPOSITORY GOES PUBLIC, this file must be scrubbed or removed. It carries
  §17's day-by-day schedule, per-person capacity figures, and hackathon strategy that
  are not meant to be published.
-->

# ResearchSumm: v1 Plan

> **Interactive research intelligence platform for biomedical literature.** Every AI-generated insight stays bound to the exact sentence, figure, or number it came from, and the whole thing is callable from Claude as an MCP server.

**Hackathon:** Aug 7-19, 2026. **Team:** Anay + Yash (both driving Claude Code).
**Real build window:** 🔴 **Aug 10-17** (shortened 2026-07-31; UCIP owns Aug 7-9: prototype Aug 8, event Aug 8-9).
**Ship-ready target:** **Aug 17**, submit Aug 18.
**⚠️ Capacity warning (2026-07-31):** school went to 5 days Mon-Fri 8:00-16:00, so Tue Aug 11 and Tue Aug 18 are **school days, not free days** as §17 originally assumed. Anay's real capacity in this window is ~16-18 hr against a ~29 hr plan. Full scope kept by Anay's explicit call, with Yash covering roughly half. **See §17 for the rebuilt schedule and the Aug 14 checkpoint.**
**Code lives at:** `C:\Users\lenovo\researchsumm\` (never inside EA, per EA folder rule).
**Created:** 2026-07-30, after a 5-advisor council pass + peer review + Anay's own scope calls.

---

## 0. How to use this file

| Section | Read before |
|---|---|
| §1 Product | Any feature work |
| §2 Locked decisions | Any architecture or scope argument. These are settled, do not re-litigate |
| §3 Architecture | Touching infra, deps, services |
| §4 Grounding spine | Anything touching evidence, anchors, verification |
| §5-11 Features | Building a surface |
| §12 Addons | Picking what to build once the spine works |
| §13 MCP | The MCP layer |
| §14-15 Design + a11y | Writing any component |
| §16 Demo day | Aug 17 onward |
| §17-18 Schedule + split | Start of every session |
| §20 Cut list | Whenever a cut feature tries to creep back |

Working rule: small vertical slices, `main` always deployable, every day ends demoable.

---

## 1. Product definition

### 1.1 One-liner
ResearchSumm turns a research PDF into a living knowledge graph where every generated claim is bound to a located quote, and exposes that grounding to Claude as a callable service.

### 1.2 Core loop
1. Drop a PDF or paste an arXiv/PMC/publisher URL.
2. Parse into sections, chunks, figures, equations, references, and a numeric ledger.
3. Classify the paper's archetype, then plan pillars from its actual content.
4. Fan out generators writing leaf nodes, each carrying located evidence anchors.
5. Explore the canvas, open a node, read it beside the highlighted source PDF.
6. Ask a question, the answer becomes a new node. The graph grows.
7. Add more papers, get cross-paper edges (agrees / contradicts / extends / shares_method / cites).
8. Connect it to Claude over MCP and let Claude verify its own claims against the source.

### 1.3 Principles
- **P1 Grounded or it does not ship.** Every generated claim carries at least one located anchor (chunk id + page + rects + verbatim quote). Unlocated claims are visibly badged, never silently shown.
- **P2 Nodes are notes, not chat bubbles.** Editable, appendable, persistent. AI writes the first draft, the user owns it.
- **P3 Pillars are emergent but bounded.** A pipeline paper and a clinical RCT must produce different pillar sets. Unbounded free-form planning is a bug in the other direction.
- **P4 Navigable without a mouse.** Full keyboard model on the canvas plus an equivalent semantic Outline view.
- **P5 Streaming everywhere.** No spinner over 400ms without progressive content or a named stage.
- **P6 The source is always one click away.**
- **P7 Honest about the limit of verification.** We prove quotation provenance deterministically. Inference is model-generated and labelled as such. See §4.4.

### 1.4 Non-goals for this window
Realtime multiplayer, mobile-native app, paper discovery/search engine, Zotero/Mendeley sync, OCR for scanned PDFs, non-PDF formats, payments.

### 1.5 Personas
| Persona | First pillar | Success signal |
|---|---|---|
| Grad student new to field | Understand, Learn | Can explain the method aloud after 20 min |
| Active researcher | Analyze, Compare | Finds a limitation they would have missed |
| Clinician | Understand, Applications | Reaches "does this change practice?" fast |
| Educator | Learn | Exports evidence-backed flashcards for a class |

---

## 2. Locked decisions

Settled by the council pass plus Anay's calls on 2026-07-30. Do not reopen without new information.

| Decision | Ruling |
|---|---|
| Scope | Full feature set, minus the §20 cut list. Anay's call: this is a strong hackathon, ship everything that earns its place. |
| Anchor coordinates | **`page.search_for(quote)` in PyMuPDF.** Returns rect lists directly, column- and publisher-agnostic. Multi-line matches return multiple rects, which is what the overlay wants. Fallback: sliding window over `get_text("words")` for ligatures and soft hyphens. Do **not** build a span-extraction or reading-order reconstruction layer. Do **not** use the pdf.js text layer for anchoring, it is content-stream ordered, not reading ordered. |
| Deployed Python service | **Killed.** PyMuPDF runs in a local seed script plus one on-demand parse function. No Fly.io, no second deploy target, no CORS, no cross-service auth. |
| pgvector, embeddings, BM25, RRF, neighbour expansion, section boost | **Killed.** One paper is 8-20k tokens. Keep the stable citation id discipline (`[C7 \| Methods \| p.4]`), drop the retrieval machinery under it. Whole paper goes in context, prompt-cached. |
| elkjs | **Killed.** Deterministic server-computed x/y, roughly 40 lines. Pillars evenly on a ring, leaves fanned on the parent's outward normal, papers in columns for multi-paper. |
| React Flow | **Kept.** Pan, zoom, edge routing, virtualization for free. |
| Verification claim | Renamed. Badge says **quote located**, not "verified". Inference is separately labelled. §4.4. |
| Research Mentor | **Replaced** by the deterministic reading path (§11). |
| Papers per workspace | **6**, not 12. |
| Service layer | Extracted to `lib/services/` on Aug 12-13, before MCP. Next routes and MCP both call it. |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, TS, React 19)        → Vercel        │
│  app/api/*        HTTP surface for the UI                     │
│  mcp/server.ts    MCP surface for Claude                      │
│  lib/services/*   ← BOTH of the above call only this          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────┐   ┌─────────────────────────────┐
│ Supabase                     │   │ scripts/seed.ts             │
│ • Postgres (no vector col)   │   │ • local PyMuPDF run         │
│ • Storage (PDFs, figures)    │   │ • chunks, sections, figures │
│ • Auth (also OAuth idp)      │   │ • equations, refs, numerics │
│ • Realtime (job status)      │   │ • search_for → rects        │
└──────────────────────────────┘   └─────────────────────────────┘
```

### 3.1 Dependencies

Frontend: `next@15 react@19 typescript tailwindcss@4 @tailwindcss/typography`, shadcn/ui + radix, `lucide-react`, `@xyflow/react`, `zustand`, `@tanstack/react-query`, `framer-motion`, `react-pdf`, `katex`, `@tiptap/react`, `cmdk`, `sonner`.

Backend/AI: `ai + @ai-sdk/anthropic`, `zod` on every LLM output, `drizzle-orm + drizzle-kit`, `@supabase/supabase-js @supabase/ssr`, `p-queue`, a fuzzy-match lib for the verifier, `@modelcontextprotocol/sdk`.

Python (script only, not deployed): `pymupdf pillow`.

Dropped from the original stack: `voyageai`, `fastapi uvicorn httpx pydantic`, `elkjs`, any pgvector extension.

### 3.2 Model routing

| Job | Model |
|---|---|
| Archetype classifier | Haiku |
| Pillar planner | Sonnet |
| Metadata extraction | Haiku |
| Leaf generators (high volume fan-out) | Haiku, prompt-cached on the paper block |
| Methodology, statistical_validity, weaknesses, synthesis, contradiction pass | Sonnet |
| Figure interpretation | Sonnet vision |
| Chat | Sonnet |
| Citation verification, anchor location, numeric checks, layout, ordering, dedup | **No LLM.** Deterministic code. |

Guardrails: cache every node in Postgres, regeneration opt-in. Prompt-cache the paper block across the whole fan-out (this is the difference between a viable and an absurd bill). Caps: 60 nodes/paper, 6 papers/workspace, 200k input tokens/request.

### 3.3 Repo layout

```
researchsumm/
├─ PLAN-V1.md                  ← mirror of this file
├─ CLAUDE.md                   ← commands + conventions + "read PLAN-V1.md"
├─ app/
│  ├─ (marketing)/page.tsx
│  ├─ (app)/w/[workspaceId]/page.tsx          canvas shell
│  ├─ (app)/w/[workspaceId]/outline/page.tsx  a11y-equivalent view
│  ├─ (app)/w/[workspaceId]/audit/page.tsx    reverse audit (addon 1)
│  ├─ (app)/s/[shareToken]/page.tsx           read-only share (addon 7)
│  ├─ dev/tokens/page.tsx                     every token + component state
│  └─ api/
│     ├─ ingest/route.ts               POST  upload or url → jobId
│     ├─ jobs/[id]/route.ts            GET   SSE progress
│     ├─ graph/[workspaceId]/route.ts  GET   nodes + edges
│     ├─ nodes/[id]/route.ts           GET|PATCH|DELETE
│     ├─ nodes/[id]/expand/route.ts    POST  generate children
│     ├─ chat/route.ts                 POST  streaming grounded chat
│     ├─ chat/promote/route.ts         POST  message → node
│     ├─ compare/route.ts              POST  cross-paper analysis
│     ├─ audit/route.ts                POST  reverse audit
│     ├─ verify/route.ts               POST  single claim verification
│     └─ export/route.ts               GET   md | bibtex
├─ mcp/
│  ├─ server.ts                 streamable HTTP transport
│  ├─ stdio.ts                  npx wrapper
│  ├─ tools/                    one file per tool
│  ├─ resources.ts
│  └─ prompts.ts
├─ lib/
│  ├─ services/     ingest.ts search.ts nodes.ts verify.ts synthesis.ts export.ts
│  ├─ agents/       orchestrator.ts + one file per generator
│  ├─ prompts/      one .ts per generator, versioned const exports
│  ├─ schemas/      zod schemas shared by agents + API + MCP + UI
│  ├─ grounding/    verify.ts anchor.ts numeric.ts entail.ts
│  ├─ layout/       radial.ts layered.ts
│  └─ db/           schema.ts queries/ migrations/
├─ components/
│  ├─ canvas/       GraphCanvas PaperNode PillarNode LeafNode ThreadNode
│  │                SynthesisNode GraphEdge Controls
│  ├─ inspector/    NodeInspector EvidenceList NodeEditor
│  ├─ reader/       PdfPane HighlightLayer SectionNav CoverageOverlay
│  ├─ chat/         ChatDock MessageList CitationChip SourcePopover PromoteButton
│  ├─ learn/        FlashcardDeck QuizRunner
│  ├─ path/         ReadingPath
│  └─ ui/           shadcn primitives
├─ scripts/         seed.ts parse.py measure-drop-rate.ts
├─ fixtures/        workspace.json  (frozen hour one)
└─ evals/           golden-papers/ cases.json run.ts
```

---

## 4. Grounding spine

This is the product. Everything else is packaging.

### 4.1 Parsing output
Per paper: pages with dimensions, text blocks with page + normalized bbox + font size + bold, sections (typed: abstract, intro, related, methods, results, discussion, limitations, conclusion, refs, other), figures and tables as rasters with associated captions, equation regions, parsed references, and the numeric ledger (addon 4).

Chunking: section-bounded, 500-800 tokens, 80 overlap, never crosses a section boundary. Two-column reading-order reconstruction happens here and only here.

Segmentation: font-size and bold outliers, plus canonical-heading regex, plus an LLM tiebreak on ambiguous cases only.

### 4.2 Stable citation ids
Every context block handed to a model carries ids the model must reuse rather than invent:

```
[C7  | Methods  | p.4] Participants were randomized 1:1 using a...
[C8  | Methods  | p.4] The primary endpoint was change in...
[F3  | Figure 2 | p.6] Kaplan-Meier survival curves showing...
[N12 | Results  | p.5] 34% (95% CI 21-45), p=0.003
```

The model cites `C7`; the app maps it to a chunk row and writes the evidence. The model never fabricates an id because it only ever selects from ids we handed it.

### 4.3 Anchors
- Inline `[^e1]` in `body_md` resolves to an evidence row (chunk, page, rects, verbatim quote, anchor_key).
- **Multi-span anchors are required, not optional.** One claim may cite N spans across pages. Aggregate claims ("three of four trials used open-label dosing", any number restated from a table) have no single contiguous source sentence. A single-span-only verifier silently degrades the whole system into a highlighter that can only emit copy-pasteable sentences.
- Anchor location via `page.search_for(quote)`, fallback sliding window over `get_text("words")`.
- Never navigate the PDF on a sub-threshold match. Show the quote in a card instead.

### 4.4 Verification, and its honest limit

Deterministic, no LLM judge:

```
for each claimed {ref, quote}:
  chunk = resolve(ref)
  if !chunk                  → drop, log hallucinated_ref
  score = token_set_ratio(normalize(quote), normalize(chunk.text))
  if score >= 0.92           → quote_located
  elif score >= 0.75         → paraphrase (badged, kept)
  else                       → drop anchor, strip [^eN] from body_md
```

Plus the **entailment overlap floor**: every number, unit, and comparator direction appearing in the claim must appear in the anchored span, checked against the numeric ledger. Catches the real failure class, which is a genuine quote attached to a reversed or overstated conclusion.

**The honest framing, and this goes in the pitch verbatim:** fuzzy-matching a quote proves *quotation provenance*, not *entailment*. A model can attach a real Methods sentence to a wrong conclusion and score 1.0. So:

- Badge reads **quote located**, never "verified".
- Claim and quote render **adjacent**, so the reader adjudicates entailment.
- Two-tier labelling everywhere: quote located (deterministic) vs inference (model-generated).
- On stage: *"we verify quotation deterministically. Inference is model-generated and we label it. Here is the drop rate."*

This is a stronger position than overclaiming, and it is one Google structurally will not take about its own output.

### 4.5 Metrics
`grounding_metrics` view: live dropped-anchor rate, hallucinated-ref count, per-generator breakdown, numeric-floor failures. Displayed in-app. Measured on 10 real biomedical PDFs via `scripts/measure-drop-rate.ts` before demo day. **Never quote a drop-rate number on stage that has not been measured.**

### 4.6 Invariants (enforce in code and tests)
1. An inline `[^e1]` with no matching evidence row is a render error, caught in CI.
2. `evidence.quote` must reach 0.92 against chunk text (or figure caption), else `quote_located = false`.
3. `edges.kind = 'contains'` forms a strict tree: paper → pillar → leaf. All other kinds are overlay edges.
4. Deleting a paper cascades its nodes and chunks but preserves cross-paper synthesis nodes, marking them `stale`.
5. No node reaches `status='ready'` with zero evidence rows unless `type` is `pillar` or `paper`.
6. A `contradicts` edge with one-sided evidence is rejected at write time.

---

## 5. Data model

Deltas from the original schema: no `embedding vector(1024)` column, no HNSW index, `numerics` table added, `share_tokens` added, `mcp_tokens` added, `learning_state` retained but simplified, flashcard scheduling columns dropped.

```
workspaces      id, user_id, title, created_at, updated_at
papers          id, workspace_id, title, authors jsonb, venue, year, doi, abstract,
                source_url, storage_path, page_count, archetype,
                status: queued|parsing|analyzing|ready|failed, parse_meta jsonb
sections        id, paper_id, parent_id, kind, heading, order_index,
                page_start, page_end, char_start, char_end
chunks          id, paper_id, section_id, order_index, text, page, bbox jsonb,
                token_count
                -- INDEX: gin (to_tsvector('english', text))
figures         id, paper_id, page, bbox jsonb, image_path, caption,
                kind: figure|table|equation|algorithm, label,
                ai_interpretation, ai_interpretation_at
numerics        id, paper_id, chunk_id, page, bbox jsonb, raw, value numeric,
                unit, kind: point|ci|pvalue|n|percent, context
references_     id, paper_id, raw, title, authors jsonb, year, doi, linked_paper_id
nodes           id, workspace_id, paper_id, parent_id, type, pillar_key,
                title, subtitle, body_md, status, origin: ai|user_question|user_manual,
                confidence, layout jsonb, collapsed, order_index, token_cost
node_versions   id, node_id, version_no, body_md, author: ai|user, reason
edges           id, workspace_id, source_id, target_id, kind, label,
                strength real, evidence jsonb
evidence        id, owner_type: node|message|edge, owner_id, paper_id,
                chunk_ids jsonb, figure_id, section_id, quote, page,
                rects jsonb, quote_located bool, match_score real,
                numeric_ok bool, anchor_key
conversations   id, workspace_id, title
messages        id, conversation_id, role, content, evidence_ids jsonb,
                model, latency_ms, promoted_node_id
flashcards      id, node_id, paper_id, front, back, evidence_ids jsonb, difficulty
quizzes         id, workspace_id, node_id, questions jsonb, difficulty
quiz_attempts   id, quiz_id, answers jsonb, score, weak_concepts jsonb
learning_state  id, workspace_id, concept, seen_count, last_seen_at
jobs            id, workspace_id, kind, status, stage, progress, payload jsonb, error
job_events      id, job_id, stage, message, created_at
share_tokens    id, workspace_id, token, scope: read, expires_at
mcp_tokens      id, user_id, workspace_id (nullable), token_hash,
                scopes: read|write, last_used_at, revoked_at
```

Node types: `paper` (root per document), `pillar` (planned), `leaf` (generated), `thread` (promoted from chat), `synthesis` (cross-paper).

Edge kinds: `contains`, `relates`, `derived_from`, `agrees`, `contradicts`, `extends`, `shares_method`, `cites`.

---

## 6. Ingestion

- Upload (PDF, ≤50MB, ≤120 pages) or paste URL.
- URL resolvers: arXiv `abs`→`pdf` rewrite, PMC, DOI via unpaywall, direct PDF.
- Validation: magic bytes, page cap, and a zero-extractable-text check that names the problem ("scanned PDF, no text layer") before the UI looks broken.
- Duplicate detection (DOI, then fuzzy title) → merge-or-open-existing prompt.
- Non-English detection → warn, proceed.
- Metadata agent (Haiku, zod), cross-checked against the parser's first-page heuristic. On disagreement prefer the LLM.
- Paywalled URL → clear message, suggest upload.

**Job stages, streamed over SSE from `job_events`:**
```
Fetching PDF → Extracting text (12 pages) → Finding sections (7) →
Building numeric ledger (41) → Reading methods → Planning your workspace →
Writing 18 notes (6/18) → Locating anchors → Ready
```

Skeleton graph appears in under 300ms: paper node plus ghost pillars pulsing, before any AI has run. This is what makes a 45s pipeline feel like 5s.

---

## 7. Pillar planning

Emergent, but bounded. Unbounded free-form planning produces overlapping mush ("Methods", "Methodology", "Study Design"), which is the same failure as a fixed taxonomy from the other direction.

**Step 1, archetype classifier (Haiku, closed set):**
`rct | cohort_study | systematic_review | method_paper | ml_model | case_report | bioinformatics_pipeline | preprint_theory | dataset_paper`

**Step 2, archetype-conditioned planner (Sonnet, zod):**
```ts
const PillarPlan = z.object({
  archetype: z.enum([...]),
  reasoning: z.string(),              // surfaced as "Why this layout?"
  pillars: z.array(z.object({
    key: z.string(),
    title: z.string(),                // <= 22 chars, canvas label budget
    intent: z.string(),
    priority: z.number().int(),       // 1 = expand by default
    leaves: z.array(z.object({
      key: z.string(),
      title: z.string(),              // <= 26 chars
      generator: z.enum([/* the 21, see §8 */]),
      rationale: z.string(),
      custom_prompt: z.string().optional()   // required when generator = custom
    })).min(3).max(9)
  })).min(3).max(6)
});
```

Rules baked into the prompt:
- Titles drawn from the paper's own vocabulary.
- Hard dedup constraint across pillar titles.
- Skip `equations` if the paper has none, skip `figures` if none extractable. **Never generate an empty node.**
- RCT and cohort must include `statistical_validity`, `biases`, `clinical_relevance`.
- ML and method papers must include `reproducibility`, `experimental_design`, `dataset_notes`.
- Systematic reviews get a Compare pillar even as a single paper.
- At least one pillar and two leaves must be paper-specific `custom`. This is the anti-template forcing function.
- Return `reasoning`, shown in the UI. Builds trust and is a good demo beat.

**Pillar contrast view.** Two papers of different archetype, pillar sets rendered side by side. This is the only form in which emergence is visible to anyone who is not reading your source code. Without it, P3 is invisible engineering.

---

## 8. Node generators (21)

`summary` `contributions` `background` `jargon` `methodology` `experimental_design` `statistical_validity` `biases` `weaknesses` `stated_limitations` `novelty` `reproducibility` `dataset_notes` `ethics` `clinical_relevance` `future_work` `equations` `figures` `does_not_establish` `concept_links` `flashcards` `quiz` `custom`

Uniform contract:
```ts
type GeneratorInput  = { paper, sections, context: Chunk[], figures?, numerics, customPrompt? }
type GeneratorOutput = {
  title: string
  body_md: string                    // MUST contain [^eN] anchors
  evidence: Array<{ refs: string[], quote: string }>   // refs is an array: multi-span
  confidence: 'high' | 'medium' | 'low'
  followups: string[]                // 2-4 child questions → chips in the UI
}
```

Each generator gets its own retrieval query, token budget, output shape, and one golden test.

Notable behaviour:
- **`jargon`** sorts by how load-bearing the term is, not alphabetically. Two levels per term: one-line plain English, then the precise definition.
- **`equations`** per equation: KaTeX render, symbol table, plain-language reading, what it is actually doing, worked micro-example. Anchored to the equation bbox.
- **`figures`** vision call on the cropped raster plus caption plus surrounding paragraph. Must state what the figure shows **and what it does not establish**.
- **`weaknesses` vs `stated_limitations`** is a real distinction and the prompts must name it explicitly or they collapse into duplicates. `stated_limitations` = what the authors admitted. `weaknesses` = what they did not. Render the pair with those labels; the contrast is a strong beat.
- **`weaknesses` and `biases`** hard-ban generic critique. "Small sample size" is rejected unless the actual n is quoted. Banned-phrase list enforced in the prompt: "further research is needed", "may be limited", "small sample size" bare.
- **`statistical_validity`** checks reported effect sizes, CIs vs bare p-values, multiplicity correction, power, pre-registration, ITT vs per-protocol.
- **`does_not_establish`** is the inverse of `summary`. Overclaiming is biomedical literature's chronic disease, so this is promoted to a first-class leaf rather than a rule buried inside `figures`.
- **`ethics`** is archetype-gated, firing only on human-subjects and dataset papers. Unconditional, it emits boilerplate on 95% of inputs.
- **`flashcards`** 8-15 atomic cards, one fact each, each evidence-backed. No trivial "what is X" cards. No scheduling.
- **`concept_links`** proposes `relates` edges between this paper's concepts and other workspace nodes. Also feeds the reading path (§11).

Execution: `p-queue` concurrency 4, prompt-cached on the paper block, **per-node failure isolation**. One failed generator leaves a retry button on that leaf and never breaks the graph.

---

## 9. Canvas, reader, inspector, chat

### 9.1 Canvas
Custom nodes with full state matrices, not just happy paths:

| Node | States |
|---|---|
| `PaperNode` | ready, parsing (shimmer), failed, focused. Page-1 thumbnail, authors, year, page count, ready badge |
| `PillarNode` | collapsed, expanded, generating, focused. 2px pillar border + 8% tint, child-count pill, rotating chevron |
| `LeafNode` | planned (dashed), generating (sweeping pillar-hue border arc), ready, stale, low-confidence, focused, selected, failed. Title + 2-line preview + evidence-count chip + confidence dot |
| `ThreadNode` | ready. Quote glyph, user's question as title, "you asked" origin badge |
| `SynthesisNode` | ready. Violet, wider, lists spanned papers as small avatars |

Edges: `contains` (solid 1px pillar hue at 40%), `relates` (dotted grey), `cites` (thin solid slate with arrow), `agrees` (solid green), `contradicts` (**dashed amber 2px, 3s dash-offset march**), `extends` (solid blue with arrow), `shares_method` (dash-dot teal), `derived_from`. Hover thickens and shows a midpoint label pill. The dash march is the one always-on animation; disable it when more than 4 such edges are visible.

Layout: deterministic, server-computed, stored as `nodes.layout`. Single paper radial (paper centered, pillars on a ring, leaves fanned at parent angle ±35°). Multi-paper layered (one cluster per column, synthesis nodes in a center gutter, low-alpha rounded hulls behind each paper's subtree). Pinned nodes survive `R` re-layout and show a pin glyph.

Zoom LOD, 3 bands:
| Zoom | Rendering |
|---|---|
| <0.4 | Pillar-hue dots + paper titles. Edges at 20% opacity |
| 0.4-0.8 | Node titles, no preview |
| >0.8 | Full cards with previews, evidence chips, followup chips |

Interaction: pan (space-drag, middle-drag, two-finger, edge-scroll while dragging), zoom (cmd-scroll, pinch, cmd +/-/0), click select, shift-click multi, drag-marquee, double-click or Enter to open, chevron or `→` to expand, `←` to collapse, drag to move (sets `pinned`), `R` re-layout, `F` focus mode (dim everything more than 2 hops from selection), `shift+F` fit selection, `backspace` delete with child confirm, `A` ask about this node.

Perf: `onlyRenderVisibleElements`, memoize on `(id, updated_at, zoomBand)`, transform-only animation, never animate width or height. Target 60fps at the ~40 nodes actually on screen.

### 9.2 Reader
`PdfPane` (react-pdf), splits with the inspector or stands alone. `HighlightLayer` renders rect lists, multiple rects per anchor, fade-in 180ms then one opacity pulse .6 → 1 → .85. `SectionNav` jump list. `CoverageOverlay` (addon 2). Page-shaped loading skeleton with the page number visible.

### 9.3 Inspector
Right drawer, paper-white reading pane, tabs **Content · Evidence · Ask**. (History tab dropped, see §20; the `node_versions` table is still written and backs the provenance badge.)

`EvidenceCard`: verbatim quote in serif italic, section and page, match score in tabular figures, quote-located / paraphrase / inference badge, "jump to source". `CitationChip`: inline superscript pill, hover popover with the quote at 140ms delay, click opens the PDF at the rects. Tiptap editing writes `node_versions` rows, supports append-to-node, and shows "AI wrote this / you edited this" provenance. Followup chips call `POST /nodes/[id]/expand`. Split view puts inspector and PDF side by side.

### 9.4 Chat
`ChatDock` bottom-anchored, collapsed or open, drag-resizable, persists across canvas navigation, scope selector (all papers / this paper / this node).

Pipeline: query rewrite from the last 4 turns → standalone question → route classifier (single-paper / cross-paper / meta) → context block with stable ids → stream Sonnet → parse `[C7]` markers **during** streaming so chips render live → post-stream verification → evidence rows.

Refusal path: below the relevance floor, say "the uploaded papers do not cover this" and offer an explicit **"Answer without sources"** toggle. Ungrounded output is always visually distinct (amber left border, no citation chips).

Suggested questions are generated from the paper's real concepts, never generic.

**Promote to node:** pillar classifier picks the parent, override dropdown available, ghost card flies from the message to the canvas position over 480ms, then the real `ThreadNode` scale-ins with a `derived_from` edge.

---

## 10. Multi-paper synthesis

1. **Claim table** per paper: claim, direction, effect size, population, method, dataset, each with evidence.
2. **Pairwise comparison** on shared concepts → `agrees | contradicts | extends | shares_method | different_population`.
3. **Two-sided evidence invariant.** A contradiction edge needs evidence from both papers or it is rejected at write time.
4. **Synthesis nodes:** Consensus, Contradictions, Methodological Divergence, Dataset Overlap, Open Questions, Timeline of Findings.
5. **Contradiction diff panel:** click the amber edge, get both verbatim quotes, both PDFs scrolled and highlighted, with population / method / effect-size deltas called out.
6. **`cites` edges** from reference parsing (addon 3).
7. Cross-paper chat scope with per-paper citation attribution.
8. "Focus one paper" mode for busy workspaces.

Note the epistemics: `contradicts` is a model judgement and cannot be deterministically verified the way an anchor can. Label it as inference, show both quotes so the reader adjudicates, and never present it with the same confidence language as quote location.

---

## 11. Learn and reading path

### 11.1 Learn
`FlashcardDeck`: space to flip, 1-4 to rate, arrows to navigate. Ratings recorded, **no SM-2 scheduling** (see §20). Quiz generator produces MCQ and short answer at fixed difficulty, explanations always cited. `QuizRunner` states: question, answered, explaining, summary. Weak-concept extraction updates `learning_state.seen_count`. A wrong answer offers to generate a targeted explainer node at a lower reading level.

### 11.2 Reading path (replaces Research Mentor)
Press a key, get walked through nodes in **dependency order**, derived from a topological sort over `concept_links` plus prerequisite depth. Deterministic, explainable, and it cannot produce an embarrassing suggestion.

It delivers what Mentor promised (know what to read next) without the parts that do not survive scrutiny: dwell time is not a mastery signal, a 0-1 mastery score from quiz plus dwell is unfalsifiable, and "you have not looked at Limitations yet" is nagging.

Surface: a rail showing path position (`3 of 11`), next and previous, and a one-line reason grounded in the graph ("Background Concepts first: Methodology cites `hazard ratio`"). Dismissible, never modal, never interrupts typing.

---

## 12. Addons

Ranked. 1-3 are the ones worth fighting for.

**1. Reverse audit.** Paste any AI-written summary of a paper in the workspace, including ChatGPT's or NotebookLM's own output. ResearchSumm audits it sentence by sentence: green quote-located, amber paraphrase, red unsupported, each clickable into the highlighted source. Roughly 90% existing code (verifier plus anchor plus reader), one route, one view at `/w/[id]/audit`. On stage you beat the competitor using the competitor's own output, which is the answer to "isn't this just NotebookLM". Highest impact-to-hours ratio in the document.

**2. Coverage heatmap.** You already store page and rects for every anchor. Overlay them on the PDF as a density map: which parts of the paper the graph actually cites, and which pages nothing touched. Answers the question every skeptical reader has ("did it read the whole thing or just the abstract?"), fully deterministic, near-free, and no comparable tool ships it. Doubles as your own QA tool during the build.

**3. `cites` edges.** You are already parsing references. Match a reference list entry against another paper in the workspace and draw a real `cites` edge. Free, and it unlocks the best cross-paper beat available: *"B's claim rests on A, which is in this workspace, and A's data contradicts it."* Unlike `contradicts`, the citation link is a fact rather than a model judgement.

**4. Numeric ledger.** Deterministic regex sweep for every number, unit, CI, and p-value, each with page and rects, stored in `numerics`. Two payoffs: a standalone "every number in this paper, sourced" view, and hard enforcement that any generated claim containing a number matches a ledger entry. This is the entailment floor made concrete instead of hand-wavy.

**5. Reverse anchor lookup.** Select text in the PDF → "3 nodes cite this sentence" → jump to them. Trivial inversion of an index you already have. Feels like magic and proves the graph is bound to the document rather than sitting beside it.

**6. `does_not_establish` leaf.** Folded into the generator list (§8).

**7. Read-only share link.** One route at `/s/[shareToken]`, one RLS policy, `share_tokens` table. Judges scan a QR and explore while you talk. The only feature here with post-hackathon distribution value.

**8. Reading path.** Folded in as §11.2.

**9. Export.** Workspace → Markdown with footnote citations, or BibTeX plus a verbatim quote appendix. Cheap, and it is what converts a demo into something someone uses next week.

---

## 13. MCP layer

This is the feature that reframes the project: ResearchSumm stops being a website and becomes grounding infrastructure that any Claude conversation can call.

### 13.1 Prerequisite
Extract `lib/services/` **before** writing any MCP code (Aug 12-13, while the routes are young). Both `app/api/*` and `mcp/server.ts` call only the service layer. Retrofitting this on Aug 17 is where a day dies.

### 13.2 Tools (12, deliberately)

| Tool | Args | Returns |
|---|---|---|
| `list_workspaces` | - | id, title, paper count |
| `create_workspace` | `title` | workspace id |
| `add_paper` | `workspace_id, url \| upload_ref` | job id |
| `get_job` | `job_id` | stage, progress, error |
| `list_papers` | `workspace_id` | id, title, authors, year, archetype, status |
| `search_paper` | `workspace_id, query, paper_id?, k?` | chunks as `[C7 \| Methods \| p.4]` plus verbatim text |
| **`verify_claim`** | `paper_id, claim, quote?` | `quote_located \| paraphrase \| unsupported`, match score, page, rects, numeric-floor result, deep link |
| `get_outline` | `workspace_id` | pillars, leaf titles, evidence counts. Compact text tree, not canvas JSON |
| `get_node` | `node_id` | `body_md` with anchors resolved inline to quote, page, deep link |
| **`create_node`** | `workspace_id, parent_id?, title, body_md, evidence[]` | node id, canvas deep link |
| `find_contradictions` | `workspace_id, concept?` | pairs with two-sided evidence, both quotes, both deep links |
| `paper_facts` | `paper_id, kind` | `numeric_ledger \| coverage \| references \| does_not_establish` |

Two design rules that carry the whole layer:

- **Every result carries the verbatim quote, page, and a deep link back into the app.** Claude cannot see the canvas, so text plus link is the entire interface. Deep links are also how a chat turn converts into a session in the product.
- **`create_node` re-verifies server-side.** An MCP client is untrusted input. If the submitted evidence fails the fuzzy match or the numeric floor, drop the anchor and mark the node low-confidence. Never let a client assert `quote_located`.

No `ask` tool. Exposing `search_paper` plus `verify_claim` and letting Claude reason is both better MCP design and a better story: we supply ground truth, Claude supplies inference.

### 13.3 Resources and prompts
Resources: `researchsumm://workspace/{id}/outline`, `researchsumm://paper/{id}`, `researchsumm://node/{id}`, so a user can `@`-mention a paper or node.
Prompts: `brief-me-on-this-paper`, `audit-this-summary`, `where-do-these-disagree`, `what-does-this-not-establish`.

> **Naming, as built:** this section predates the rename to Pepiros. The implemented scheme is `pepiros://workspace/{id}/outline`, `pepiros://paper/{id}`, `pepiros://node/{id}`, and the stdio wrapper in §13.4 is `pepiros-mcp` — the package, repo, and every other identifier say pepiros, so this doc is the stale one, not the code. Prompt names are as listed above and were implemented unchanged.

### 13.4 Transport and auth

Ship in this order:

1. **Remote streamable HTTP plus OAuth 2.1 with dynamic client registration.** Required for claude.ai Connectors, and this is the demo. Supabase Auth is already the identity provider, so this is an OAuth wrapper rather than a new auth system.
2. **stdio wrapper** (`npx researchsumm-mcp`, token from env) for Claude Code and Desktop. Roughly 20 lines once the tool layer exists.

**Security, non-negotiable:**
- Per-token scopes in `mcp_tokens`: `read` vs `write`, optionally pinned to a single workspace. `create_node` and `add_paper` require `write`.
- Every query runs under the user's RLS context. The Supabase service-role key never leaves the server and never reaches the MCP layer.
- Store token hashes, never raw tokens. Support revocation.
- Rate limit per token. `add_paper` is the expensive one, cap it hard.
- Log every tool call with token id, feeding the metrics view.

**Verify the MCP spec against Anthropic's current docs on Aug 16.** Transport and connector requirements move; do not build from memory.

### 13.5 The demo beat this unlocks
Better than anything else in the script:

> In Claude, no ResearchSumm tab open. "Summarize this RCT's primary outcome." Claude answers from its own reading. Then: **"now verify every claim you just made."** Claude calls `verify_claim` on its own sentences. Two return `quote_located` with page numbers, one returns `unsupported`, and Claude says so out loud. Then `create_node` writes the audited result into the graph, and clicking the returned link opens the canvas with the new node already there, anchored, highlighted in the PDF.

Self-auditing AI, on stage, in the judges' own interface. It also makes "isn't this NotebookLM" unanswerable in your favour, because NotebookLM is not a tool other models can call.

### 13.6 Optional, 30 minutes
A thin Claude Code plugin (`.claude-plugin/` with the MCP config plus two skills) so `/researchsumm` works in a terminal. Free distribution surface off work already done.

---

## 14. Design system

### 14.1 Thesis
**"Lab notebook at night."** Dark-first, low-chroma surfaces so content and pillar colour carry all the signal. Dense but never cramped: a professional tool for long sessions, closer to Linear or Figma than a consumer chat app. Nothing bounces. Nothing is a purple gradient. Every motion has a spatial reason.

Three deliberate anti-generic moves:
1. **Paper-white reading surfaces on dark chrome.** Node bodies and the PDF pane use a warm off-white card. Long-form reading on near-black is the single biggest tell of a rushed AI-built tool.
2. **Pillar colour as a structural system**, applied to edges, node borders, citation chips, and the coverage overlay, so the colour language is learnable in 30 seconds and the graph is navigable by hue.
3. **A real typographic hierarchy.** Serif for prose, grotesque for UI, mono for ids. Not one sans at four sizes.

### 14.2 Tokens

```css
:root {
  /* Surfaces, dark, warm-shifted rather than blue-black */
  --bg-void:       #0B0C0E;   /* canvas backdrop */
  --bg-base:       #121316;   /* app chrome */
  --bg-raised:     #191B1F;   /* panels, chat dock */
  --bg-overlay:    #22252A;   /* popovers, menus */
  --bg-paper:      #FAF8F4;   /* reading surface, always light */
  --bg-paper-sunk: #F0EDE6;   /* quote and code blocks on paper */

  --line-subtle:   #23262B;
  --line-default:  #2E3238;
  --line-strong:   #3D424A;
  --line-paper:    #E2DDD2;

  --fg-primary:    #ECEDEF;
  --fg-secondary:  #A5A9B0;
  --fg-tertiary:   #6E747D;
  --fg-disabled:   #4A4F57;
  --ink-primary:   #17181A;
  --ink-secondary: #4A4D52;
  --ink-tertiary:  #7C8086;

  --accent:        #5B8DEF;
  --accent-hover:  #7AA3F5;
  --accent-sunk:   #3E6FCB;
  --accent-wash:   #5B8DEF1A;

  /* Pillar palette, assigned in planner order, cycles past 7 */
  --pillar-1: #4EA8DE;  /* cyan-blue */
  --pillar-2: #E8963C;  /* amber     */
  --pillar-3: #56C271;  /* green     */
  --pillar-4: #B57BE8;  /* violet    */
  --pillar-5: #E8657A;  /* rose      */
  --pillar-6: #E8C84E;  /* yellow    */
  --pillar-7: #4ED6C0;  /* teal      */

  --ok: #56C271;  --warn: #E8963C;  --danger: #E8657A;  --info: #4EA8DE;
  --located:    #56C271;   /* quote located */
  --paraphrase: #E8963C;   /* 0.75-0.92 */
  --inference:  #8A8F97;   /* model-generated, not verified */
  --ungrounded: #E8C84E;   /* answered without sources */

  --font-ui:   "Inter var", system-ui, sans-serif;
  --font-read: "Source Serif 4", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --t-display: 28px/1.2  -0.02em 600;
  --t-h1:      20px/1.3  -0.01em 600;
  --t-h2:      16px/1.4  -0.01em 600;
  --t-body:    14px/1.55  0      400;
  --t-read:    16px/1.7   0      400;   /* node prose, serif */
  --t-small:   13px/1.45  0      400;
  --t-micro:   11px/1.3   0.03em 500;   /* labels, badges, uppercase */
  --t-mono:    13px/1.5   0      400;

  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px;
  --s-5:24px; --s-6:32px; --s-7:48px; --s-8:64px;
  --r-sm:6px; --r-md:10px; --r-lg:14px; --r-xl:20px; --r-full:999px;

  /* Dark UI: borders plus low-alpha shadow, not big blurs */
  --e-1: 0 1px 2px #0000004D;
  --e-2: 0 4px 12px #00000066, 0 0 0 1px var(--line-default);
  --e-3: 0 16px 40px #00000080, 0 0 0 1px var(--line-strong);
  --glow-accent: 0 0 0 3px var(--accent-wash);

  --dur-fast:120ms; --dur-base:200ms; --dur-slow:320ms; --dur-canvas:420ms;
  --ease-out:    cubic-bezier(.16,1,.3,1);
  --ease-inout:  cubic-bezier(.4,0,.2,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);   /* node expand only */

  --rail-left:64px; --panel-papers:256px;
  --inspector:clamp(400px,34vw,560px);
  --chat-collapsed:56px; --chat-open:min(46vh,420px);
  --topbar:52px;
}
```

Dark only for v1. Light theme is cut (§20).

### 14.3 Motion
| Event | Animation |
|---|---|
| Node appears | scale .92→1, opacity 0→1, `--dur-base`, `--ease-out`, 40ms stagger per sibling |
| Pillar expands | children spring along the parent's radial vector, `--dur-canvas`, `--ease-spring`, 50ms stagger |
| Node generating | 1.5px pillar-hue arc sweeping the border, 1.4s linear loop |
| Inspector opens | slide 24px from right plus fade, `--dur-base`; canvas pans to keep the node visible |
| **PDF highlight** | rects fade in over 180ms, then one opacity pulse .6→1→.85. **This is the money shot, give it real care** |
| Citation chip hover | popover fade plus 2px rise, 90ms, 140ms open delay |
| Chat streaming | tokens append, no per-token animation, 2px caret blinks at the tail |
| Chat → node | ghost card flies from message to canvas position, 480ms `--ease-inout`, then the real node scale-ins |
| Contradiction edge | continuous 3s dash-offset march, disabled above 4 visible such edges |

`prefers-reduced-motion: reduce` turns all of the above into opacity-only crossfades at `--dur-fast`, and stops the dash march and border sweep.

### 14.4 Voice
- Node bodies: direct, specific, no hedging preamble. Not "this paper appears to suggest that", but "the authors report a 34% reduction (95% CI 21-45) [^e3]".
- Jargon defined at two levels: one-line plain English, then precise.
- Critique concrete and cited. Banned phrases enforced in the prompt.
- Empty and error copy says what happened, then what to do. No apologies.
- No cutesiness. "Generating 6 nodes", not "working some magic".
- Reading path suggests, never nags. No exclamation marks, no gamification.

### 14.5 States for every surface
**Empty.** No workspace: centered generous dropzone, "Drop a paper, or paste a PDF link", plus 3 example papers (one RCT, one ML method, one two-column review) as one-click loads that work even if an API key fails. One paper present: canvas hint, "add a second paper to unlock cross-paper analysis". Chat with no messages: 4 suggested questions from the paper's real concepts.

**Loading.** Never a bare spinner. Canvas gets the skeleton graph. Node bodies get 3 shimmer lines at prose width. PDF gets a page-shaped skeleton with the page number.

**Error.** Parse failed: node shows the reason plus Retry / different file / paste text. Generation failed: leaf keeps a retry button, siblings unaffected. Rate limited: inline banner with an ETA countdown, queue continues. Offline: banner, cached reads, queued writes.

**Edge cases handled explicitly.** 120-page paper (chunk cap plus warning), non-English (detect, warn, proceed), zero figures (skip the node), paywalled URL (clear message, suggest upload), duplicate paper (merge or open existing), 6-paper workspace (LOD plus focus-one-paper mode).

---

## 15. Accessibility

- **Canvas role is `img` with an `aria-label` summary, or `aria-hidden` with a visible skip-link to Outline. Not `role="application"`.** `application` suppresses screen-reader browse mode, which makes the canvas less accessible, not more. The Outline view is the real screen-reader path.
- Keyboard nav retained for sighted keyboard users: Tab and shift-Tab in layout order, arrows to the nearest node directionally, Home to paper root, `]` and `[` for siblings, Esc to clear focus or close the inspector. Focused node gets `--glow-accent`.
- `aria-live="polite"` announces focus changes and generation completion ("Weaknesses node ready, 4 sources").
- **Outline view** at `/w/[id]/outline`: the full graph as a nested semantic `<ul>` with the same actions, linked from the canvas and from skip-nav. Doubles as the demo-day fallback UI.
- Contrast: all text at least 4.5:1, UI borders at least 3:1. **Audit `--pillar-2` amber and `--pillar-6` yellow against `--bg-raised` specifically**, they are the ones that fail.
- Colour is never the only channel: contradiction edges are dashed *and* amber *and* labelled; located evidence has a check glyph *and* green.
- Chat is a proper `log` region; streaming responses announce on completion only.
- Full keyboard path: skip-nav → topbar → papers panel → canvas → inspector → chat.
- Respect `prefers-reduced-motion`, `prefers-contrast`, and 200% browser zoom (panels stack).

---

## 16. Demo day

### 16.1 Hardening checklist
- 3 papers fully pre-seeded: chunks, numerics, pillars, nodes, anchors, edges, contradiction pairs, `cites` edges, all cached.
- **One planted misattribution** in the corpus, caught live by the numeric floor. This is the strongest available answer to "does the quote actually support the claim?"
- `CACHE_ONLY` env flag serving everything from Postgres.
- Local Supabase plus local dev server path, not the deployed URL.
- 90-second screen recording made Aug 17 (was Aug 18, moved with the shortened window).
- MCP connector pre-added on a second account as the fallback, so a failed live connector add can be skipped.
- Judge-supplied PDFs are a Q&A flourish, never part of the scripted run.
- Drop-rate numbers measured on 10 real PDFs. Never quote an unmeasured figure.

### 16.2 The 90-second script

| Time | Beat |
|---|---|
| 0:00-0:10 | "Two papers on the same question, opposite conclusions, and nothing tells you." Pre-seeded workspace already loaded. |
| 0:10-0:25 | Two papers side by side, visibly different pillar sets. "These categories came from the papers, not from a menu. An RCT and a CNN paper get different ones." |
| 0:25-0:45 | Open a node. Claim and quote adjacent. Click a chip: PDF snaps to page 4, rects light up on the exact sentence. **Pause here.** |
| 0:45-1:00 | "We verify quotation deterministically, no LLM judging itself. Inference is labelled separately. 41 anchors, 1 dropped, and here is the coverage map showing which parts of the paper the graph actually cites." |
| 1:00-1:15 | Amber contradiction edge. Click. Side-by-side diff, both quotes highlighted in both PDFs. |
| 1:15-1:30 | Switch to Claude. "Verify every claim you just made." `verify_claim` fires, one comes back unsupported, Claude says so, `create_node` writes it back, click the link, node is on the canvas. End. |

Cut from the demo entirely: flashcards, quizzes, reading path, export, settings. They exist in the product, they do not appear in 90 seconds.

---

## 17. Schedule, Aug 10-18

> 🔴 **REBUILT 2026-07-31. Read this before the table.**
>
> The original version of this section budgeted **~29 hours** of Anay's half across "free days Tue 11, Sat 15, Sun 16, Tue 18." **Tue Aug 11 and Tue Aug 18 are no longer free.** School changed on Aug 1 from 4 days (Tuesday holiday) 8:00-15:00 to **5 days Mon-Fri 8:00-16:00**. Anay also shortened the window: ship Aug 17, submit Aug 18.
>
> **Real capacity for Anay in this window is roughly 16-18 hours, not 29.** The remaining fixed load inside it: school Mon-Fri 8:00-16:00, math tuition Tue 11 + Thu 13 16:30-17:30, physics Wed 12 18:30-19:30, gym Tue/Thu/Sat, SAT tuition Sat 15 + Sun 16 10:00-12:00, alternate-Saturday math Aug 15, and sleep 7.5 hr which is non-negotiable.
>
> **Scope decision (Anay's call, 2026-07-31, made against council advice):** keep full scope, with Yash covering roughly half. A 5-advisor council plus peer review flagged this as the single biggest risk in the Aug-Sept plan. It is recorded here as a stated assumption rather than silently absorbed, and the mitigation is the **Aug 14 checkpoint** plus the slip order below. See `decisions/log.md` 2026-07-31.
>
> IOAI is **zero** for this whole window (its 3 hr/wk weekend budget is lent to this sprint and repaid Aug 22-23), so this sprint no longer has to route around an IOAI block. IBDP morning retrieval and SAT tuition **do** stand and are not negotiable.

| Day | Anay (`lib/` `scripts/` `mcp/`) | Yash (`components/` `app/`) |
|---|---|---|
| **Mon Aug 10** (school) | Freeze `types/anchor.ts` + `fixtures/workspace.json` together, hour one. Supabase schema, RLS, `search_for` spike (must render one rect on one page before anything else) | Tokens, `/dev/tokens`, app shell, papers panel, topbar |
| **Tue Aug 11** (school, math + gym: **shortest day of the sprint**) | Parser: blocks, columns, sections. Figures, equations, references, numeric ledger slide to Wed if needed | Canvas, all 5 node types, full state matrix, deterministic layout |
| **Wed Aug 12** (school, physics 18:30) | **Extract `lib/services/`**, ingest pipeline, job events, SSE. Parser tail from Tue | Inspector, evidence cards, citation chips, popovers |
| **Thu Aug 13** (school, math + gym: **short day**) | Archetype classifier, pillar planner, first 8 generators | Reader, highlight layer, section nav, split view |
| **Fri Aug 14** (school) 🔴 | Verifier, entailment floor, multi-span anchors, metrics view. **CHECKPOINT: is parse to locate to verify to highlight working end to end? If no, fire the slip order tonight.** | Chat dock, streaming chips, promote-to-node animation |
| **Sat Aug 15** (SAT tuition 10-12, gym, alt-Sat math) | Remaining generators, fan-out, prompt caching, failure isolation | Coverage overlay, reverse anchor lookup, outline view |
| **Sun Aug 16** (SAT tuition 10-12) | Claim table, synthesis nodes, contradiction pass, `cites` edges. **Check MCP spec against current docs** | Contradiction diff panel, learn UI, reading path rail |
| **Mon Aug 17** (school) 🔴 **SHIP** | MCP tools (12), resources, prompts, stdio wrapper. Seed 3 papers, plant the misattribution, measure drop rate on 10 real PDFs. Rehearse | Reverse audit view, share link, export, empty and error states. A11y audit, deck, recording |
| **Tue Aug 18** (school) | Submit. Record the demo. **Sprint ends here.** | Submit. |

**If OAuth slips:** ship stdio only and demo through Claude Code instead of claude.ai. Same beat, one fewer setup step. Given the compressed window, **assume stdio-only from the start** and treat OAuth as the stretch, not the plan. Decide by Aug 16.

**Slip order** (what compresses first, in this order): export, quiz, flashcards, reading path rail, share link, reverse anchor lookup, then the 21 generators down to the 8 that carry the demo. Never: the anchor spine, the verifier, the highlight, the contradiction diff, the MCP `verify_claim` tool.

**What "borrowing from sleep" costs, so it is not an option on the table:** the DP1 First Formative Assessment is Sep 21-30 and the SAT is Nov 7. Both are downstream of the recovery this sprint does or does not get. Aug 20 is a hard reset date back to baseline regardless of where the code is.

---

## 18. Two-person split

Both drive Claude Code, so the constraint is merge surface, not typing speed.

- **Hour one, together:** freeze `types/anchor.ts` and commit `fixtures/workspace.json` (3 papers, ~30 claims, real hand-extracted rects, 1 contradiction pair, 1 `cites` link, 1 planted misattribution). Everything after this is parallel because both sides code against the fixture rather than against each other.
- **Anay** owns `lib/` `scripts/` `mcp/` `app/api/`. The atom: parse pipeline, anchoring, verifier, entailment floor, 21 generators, planner, synthesis, MCP.
- **Yash** owns `components/` and `app/(app)/` pages. Canvas, node states, inspector, reader, highlight layer, chat dock, learn, reading path, outline, audit view, design tokens, a11y.
- Shared files are `types/` and `fixtures/`, and changes to either need a heads-up. Nothing else is co-owned.

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| UCIP bleeds past Aug 9 | ResearchSumm starts Aug 10 regardless. UCIP prototype is already built two weeks early (see `decisions/log.md` 2026-07-18), so this is low. |
| `search_for` fails on a publisher family | 2h spike Aug 10, hour one, on 5 PDFs from 5 publishers. If it fails, fall back to page scroll plus a quote card and drop bbox language from the pitch. Know this on day one, not day nine. |
| Aggregate claims have no contiguous span | Multi-span anchors specced from the start (§4.3). Measure drop rate by generator; if one generator is above 10%, rewrite its prompt to cite spans rather than paraphrase. |
| Contradiction pass hedges and produces nothing crisp | Hand-pick the two demo papers for a known real disagreement, verify the edge fires deterministically before Aug 18. |
| MCP OAuth slips | stdio fallback, demo in Claude Code. |
| Live connector add fails on stage | Pre-added connector on a second account. |
| Fan-out token bill | Prompt-cache the paper block, cache every node, regeneration opt-in, hard caps. |
| 🔴 **Window shrank ~40% but scope did not** (2026-07-31) | The one risk that materialised before the sprint even started. School went to 5 days, deleting both "free" Tuesdays. Anay kept full scope knowingly. Mitigation is entirely in §17: the Aug 14 end-to-end checkpoint, the slip order, stdio-first MCP, and Aug 20 as a hard reset. If the checkpoint fails and the slip order is not fired, this is the failure mode that eats the DP1 assessment prep downstream. |
| IBDP or SAT squeezed | Neither yields. SAT tuition (Sat/Sun 10:00-12:00) and the IBDP morning retrieval block are fixed through the sprint. IOAI is already at zero for this window, so there is nothing left to borrow except sleep, and sleep is non-negotiable. The lever is scope, per the §17 slip order. |
| Judge says "this is NotebookLM" | Reverse audit (addon 1) plus the MCP self-verification beat. Answer prepared, not improvised. |

---

## 20. Cut list

Explicit, so nothing creeps back. Cut on merit, not on schedule.

| Cut | Reason |
|---|---|
| **Research Mentor** (whole engine, mastery scores, dwell tracking, 6 trigger rules) | Dwell time is not a mastery signal; a 0-1 score from quiz plus dwell is unfalsifiable; "you have not looked at Limitations yet" is nagging. Replaced by the deterministic reading path (§11.2). |
| **SM-2-lite scheduling** (`ease`, `interval_days`, `due_at`, `reps`) | Spaced repetition pays off over weeks. In a v1 with no retention it is dead code. Flashcards stay, they are novel because they are evidence-backed. |
| **Adaptive quiz difficulty** | Adaptive needs a history that does not exist. Fixed difficulty. |
| **`mindmap` generator** | The canvas already renders a graph. Same data twice. |
| **`notes` generator** | AI writing the user's notes contradicts P2. Replaced by a blank user-created node. |
| **`takeaways` generator** | Third overlapping variant of `summary` plus `contributions`. Reads as padding. |
| **`strengths` generator** | Nobody reads a paper to learn it is good, and it is a sycophancy magnet. Real signal folded into `novelty`. |
| **Version history diff UI** (History tab) | `node_versions` table stays and backs the provenance badge. The diff viewer is a second full UI nobody opens. |
| **Light theme** | Design thesis is dark-first. A token swap looks worse and costs an afternoon of dual-mode contrast audits. |
| **Minimap** | At 6 papers with fit-to-view and cmd-K it is decoration. Hours go to the highlight animation instead. |
| **pgvector, embeddings, BM25, RRF, neighbour expansion, section boost** | One paper is 8-20k tokens. Retrieval machinery for a corpus that fits in context. Stable citation ids kept. |
| **elkjs** | Async layout jitter on first paint, hours of tuning, judges perceive nothing. |
| **Deployed FastAPI service on Fly.io** | Second deploy target, cold starts, CORS, cross-service auth, in a secondary language, for zero benefit once parsing is a seed script. |
| **12 papers per workspace → 6** | 12 x 60 = 720 nodes is illegible at any zoom. Design cut. |
| **Zoom LOD 4 bands → 3** | Top band folded into the default. |
| **`ethics` unconditional → archetype-gated** | Boilerplate on 95% of papers, which is the generic-critique failure mode banned elsewhere. |
| **60fps at 150 nodes** | ~40 nodes on screen. Target the real number. |
| **`role="application"` on canvas** | Suppresses screen-reader browse mode. Correctness fix, not a preference. See §15. |

Net: 26 generators to 21, one whole subsystem gone, one deploy target gone, and nothing that appears on screen during the demo is lost.

---

## 21. Open questions

1. **Hackathon judging criteria.** Aug 7-19 dates are confirmed; the rubric is not. If it weights impact or social good over technical depth, lead the pitch with the clinician persona rather than the grounding engine.
2. **Submission format.** Live demo, recorded video, or written? Changes how much of §16 matters.
3. **Prize and team-size rules.** Confirm a 2-person team is eligible.
4. **Post-hackathon.** The anchor engine is document-type agnostic. Pointing it at IB syllabus PDFs makes it a StudentSuite module with an existing audience. Decide after Aug 19, do not scope it now.

---

## 22. Platform vision

**Confirmed 2026-08-10, Aug 17 target.** Pepiros expands from a private single-workspace tool into a public platform. This is additive scope on top of §1-21, not a replacement — §2's locked decisions and §16's demo script still govern the Aug 17 grounding-spine/MCP demo itself.

### 22.1 Feature list

1. **Auth & accounts** — sign up/in, profile (Supabase Auth already in the stack)
2. **Public paper library** — uploaded papers can be published beyond the uploader's private workspace into a shared, discoverable catalog
3. **Auto-graph-on-upload** — the existing grounding-spine engine (pillars/leaves/anchors) runs automatically on publish, no manual "analyze" step — same engine, new trigger, same as a search engine auto-indexing a submitted page
4. **Discovery/feed** — browse, search, sort public papers (recent, trending, most-discussed)
5. **Per-paper discussion** — Substack-style comments/threads on a paper, and on individual claims/nodes
6. **Follows + likes** — follow authors/papers, like a paper or a specific claim
7. **Curated open-access library** — Pepiros also lists freely-distributable papers itself (arXiv, PMC open access, CC-licensed), so there's something to browse before anyone uploads

### 22.2 Licensing

**Open-access only.** Only papers Pepiros is legally allowed to list get listed — arXiv/PMC-OA/CC-licensed for the curated library. A user's own copyrighted uploads stay private to their workspace and are never added to the public catalog unless the license permits it.

### 22.3 Timing and risk

Full platform targets **Aug 17**, the same deadline as the grounding-spine/MCP demo — not a post-hackathon phase. This is a large scope addition on top of an already-ambitious build that the 2026-07-30 council pass (§17 header) already flagged as the plan's biggest risk; flagging it again here because it now compounds with that risk, not because the call is wrong. Built via parallel Claude-Code-driven sessions across Anay and Yash, outside the Aug 10 design-system session that produced this section and the Editorial Paper direction (`design/DIRECTIONS.md`, `design/prompts/`).

### 22.4 Design direction

Locked: **Editorial Paper** (Are.na × Instapaper/NYT Reader), confirmed by both Anay and Yash. Keeps the existing §14.1 thesis (dark chrome / paper-white reading surface / pillar-hue graph) and leans the reading-surface pillar harder — warm high-grain paper texture, serif small-caps UI chrome, +25% whitespace, ~20%-softened pillar saturation, unhurried ease-out-only motion. Canonical palette (replaces §14.2's placeholder pillar hex values): Stone `#B8B2A4`, Clay `#C4A78A`, Sage `#7D8A73`, Dusk `#6E6AA7`, Rose `#B46A6A`, Ochre `#D4B26A`, Teal `#5F8D86`. Full brief and image-generation prompts for all 8 app surfaces (including the 5 new platform surfaces above) in `design/DIRECTIONS.md` and `design/prompts/`.

Positioning stays **grounding-first**: the deterministic-verification pitch leads everywhere (landing hero, voice guide), platform ambition is the "where this is going" layer under it, never the headline — it's what the Aug 17 demo script is built on and it's the hardest thing to copy.

---

## Update log

- **2026-08-10** §22 Platform Vision added: public accounts, paper uploads, auto-graph-on-publish, discovery feed, per-paper discussion, follows/likes, curated open-access library. Targets Aug 17, same deadline as the existing demo. Open-access-only licensing confirmed. Editorial Paper locked as the design direction (Anay + Yash), canonical palette adopted from a reference board, full prompt set in `design/`. Additive to §1-21, nothing existing changed.
- **2026-07-31** §17 schedule rebuilt and the header capacity line added. School changed to 5 days Mon-Fri 8:00-16:00 on Aug 1, so Tue Aug 11 and Tue Aug 18 (budgeted as free days) are school days. Build window shortened to Aug 10-17, ship Aug 17, submit Aug 18. Real capacity ~16-18 hr against the ~29 hr the original table assumed. **Scope unchanged**: Anay's explicit call, made against a 5-advisor council + peer review that flagged it as the biggest risk in the Aug-Sept plan, with Yash covering roughly half. Mitigations added instead of a scope cut: an explicit **Aug 14 end-to-end spine checkpoint**, stdio-first MCP (OAuth demoted to stretch), the 21 generators added to the slip order, and Aug 20 fixed as a hard reset date back to baseline. Nothing in §1-16 or §18-21 changed. See `decisions/log.md` 2026-07-31 and `context/current-priorities.md`.
- **2026-07-30** Created. Council pass (5 advisors, 5 peer reviews) plus Anay's scope calls. Locked: full feature set minus §20, `search_for` anchoring, no deployed Python service, no pgvector, no elkjs, Mentor replaced by reading path, 9 addons, MCP layer added. Dates confirmed Aug 7-19, real window Aug 10-19, Yash confirmed Claude Code capable.
