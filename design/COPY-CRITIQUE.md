# Copy Critique: Pepiros

Reviewed 2026-08-15 against the code at `C:\Users\lenovo\pepiros`. Every string below was read in the file, not recalled. Line numbers are as of this pass.

Scope: `app/(marketing)/*`, `app/(platform)/*`, `app/(app)/*`, `app/(reader)/*`, `components/site/*`, `components/chat/*`, `components/inspector/*`, `components/ui/*` (copy-bearing only), `public/llms.txt`, `app/layout.tsx`, `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`.

This is a critique pass. Nothing outside this file was changed.

---

## 1. Verdict

The evidence copy is the best-written product writing in the repo and it holds the thesis line without flinching: the badge never says "verified" anywhere a user can see it, and the limitations are stated rather than buried.

Everything wrapped around that spine is written in the present tense about features that do not exist, which is the opposite failure and a worse one, because it borrows credibility from the one part that earned it.

The two hardest defects are the `/mcp` page (it advertises twelve tools and an install command, and both are false) and the pervasive present tense on ingest, publishing, and the public library, none of which have ever run.

Voice is consistent and genuinely good in the marketing group: restrained, unhurried, concrete. It breaks down completely in the `(app)` group, which was written to a different brief and calls papers "posts".

Terminology has drifted into roughly four names for every core concept, and three separate labels point at the same `/upload` route.

---

## 2. Severity-ranked findings

BLOCKER means the sentence states something false about what the code does. HIGH means it is misleading, unreachable, or breaks a hard rule. MEDIUM is register or consistency. LOW is polish.

### BLOCKER

| file:line | current text | what is wrong | proposed replacement |
|---|---|---|---|
| `app/(marketing)/mcp/page.tsx:136` | "Twelve tools over MCP." | `mcp/tools/index.ts` registers **eight**: `list_papers`, `search_paper`, `verify_claim`, `get_outline`, `get_node`, `create_node`, `find_contradictions`, `paper_facts`. This is the single most checkable claim on the site and a judge with an MCP client will check it. | "Eight tools over MCP." |
| `app/(marketing)/mcp/page.tsx:147` | "12 tools" (section kicker) | Same count error, repeated as a standalone label so it reads as a spec. | "8 tools" |
| `app/(marketing)/mcp/page.tsx:29-36` | Cards for `list_workspaces`, `create_workspace`, `add_paper`, `get_job` | Four tools that are not registered. An agent that reads this page and calls them gets a tool-not-found error. The group heading "Workspace & papers" then holds five entries of which one is real. | Delete the four cards. Rename the group "Papers" and leave `list_papers` in it. If the roadmap value matters, add a separate, visibly quieter line: "Planned: workspace creation, paper ingest, and job polling, once the ingest pipeline lands." |
| `app/(marketing)/mcp/page.tsx:227` | `npx pepiros-mcp` | Cannot resolve. `package.json` is `"name": "pepiros"`, `"private": true`, and has no `bin` field, so no such package exists on npm and nothing would be linked if it did. `README.md` documents `npx tsx mcp/stdio.ts`; `package.json` exposes `npm run mcp:stdio`. | `npm run mcp:stdio` with a second line: "or `npx tsx mcp/stdio.ts` from a clone. A published `pepiros-mcp` package is not out yet." |
| `app/(marketing)/mcp/page.tsx:123` | "the 12-tool grid" (component doc comment) | Not user-visible, but it is the source the page copy was written from, so it will regenerate the error on the next edit. | "the 8-tool grid" |
| `mcp/tools/index.ts:15` | "7 of the spec's 12 are registered here" | The code's own comment is stale against the code below it, which registers 8. This is where a writer would go to check the number. | "8 of the spec's 12 are registered here" |
| `app/(marketing)/page.tsx:19` | "Publish: auto-graph runs the moment you publish, no manual step." | Present tense. There is no publish flow, no ingest pipeline, and no auto-graph. The section header above it does say "Where this is going," but the item copy contradicts the header. | "Publish: publishing will run the graph automatically, with no manual step." Apply the same tense fix to lines 20, 21, 22. |
| `app/(platform)/upload/page.tsx:255` | "Publishing runs the grounding graph automatically, no manual "analyze" step." | Said on the upload form itself, where a user is about to hand over a file. `POST /api/ingest` validates and queues; parsing is a stub. The file's own doc comment at :31-32 already concedes "acceptance means queued, not analyzed". | "Your file is validated and queued. Graph building is not live in this build yet, so nothing will be generated from it." |
| `app/(platform)/upload/page.tsx:159` | "Upload a PDF or paste an arXiv, PMC, or DOI URL. We build the grounding graph from there." | No PDF has ever been through the system. The second sentence is the whole product promise made at the exact moment it cannot be kept. | "Upload a PDF or paste an arXiv, PMC, or DOI URL. Validation and queueing work now; graph building lands with the parser." |
| `components/site/PacingStrip.tsx:13-39` | "<300ms", "<1s", "<2s", "~5-10s", "~15-45s" under the heading "What happens when you upload" | Five specific latency figures presented as observed behaviour on both `/` (`page.tsx:88`) and `/how-it-works` (`:68`). No ingest pipeline exists, so none of these has been measured. Numbers are the most trust-bearing thing on a page about grounding, and these are unsourced. | Keep the five stops, relabel the column. Change the section heading to "The pacing we are building to" and the timings to "target <300ms" style, or drop the numeric column until one real ingest run exists. |
| `app/(marketing)/about/page.tsx:132` | "GitHub: coming at public launch" | `README.md:85` publishes `git clone https://github.com/StudentSuite/pepiros.git` and `README.md:9` carries a public CI badge. The repo also has full OSS scaffolding (LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, issue templates). Either the repo is private and the README is wrong, or the page is wrong. Both cannot ship. | Once public: replace with a real link, "Source on GitHub: StudentSuite/pepiros". Until then, say the honest version: "Source opens after submission." Whichever is true, make `README.md`, `/about`, `/contact` and `SiteFooter` agree in one pass. |
| `app/(marketing)/contact/page.tsx:41-42` | "For a bug, open a GitHub issue once the repository is public. For a security report, see the private disclosure flow described in SECURITY.md." | Same contradiction, plus it directs a web visitor to a filename they have no way to open. There is no `/security` route. | "For a bug, open an issue on the repo. For a security report, do not open a public issue; email the maintainers first." Add the address, or add `/security` and link it. |
| `app/(reader)/w/[workspaceId]/audit/AuditClient.tsx:92` | "the marker should be stripped from bodyMd on re-verification (plan.md §5 invariant)." | Internal spec reference and an internal field name (`bodyMd`) leaked into user-visible UI. A reader has no `plan.md`. | "The citation marker should have been removed when the anchor was dropped. It was not, so it is flagged here rather than hidden." |
| `components/inspector/NodeInspector.tsx:55` | `title="no matching evidence row for this marker (render error per plan.md invariants)"` | Same leak, in a tooltip. | `title="This citation marker points at evidence that is not on this node. Nothing was silently dropped; the marker is shown as broken on purpose."` |
| `components/chat/ChatDock.tsx:82` | "No model key configured. Set GROQ_API_KEY (or FEATHERLESS_API_KEY) in .env to enable chat." | Shows an end user a server-side environment variable and a file they do not have. On a deployed instance this is both useless and a small information leak about the stack. | User-facing: "Chat is unavailable on this instance." Keep the env-var detail in the server log and in `README.md`, not in the dock. |
| `app/(app)/home/page.tsx:48-59` | "Circadian Rhythm & Cognition", "3 papers · last opened 2 hours ago", "Reading path", "3 of 8", `Progress value={37}` | Every one of these is hardcoded and rendered as the signed-in user's own state, under the heading "Continue reading" with a "Resume" button. The file's own doc comment at :19-21 claims "Only what the data model can honestly support appears here", which this block violates. | Either derive it or label it. Minimum honest version: keep the card, add a tag next to the heading reading "demo data", the same pattern `settings/page.tsx:235` already uses. |
| `components/chat/PromoteButton.tsx:47` | "Promoted to graph" | Nothing was promoted. The handler at :34 is `console.log("promote (stub, no create_node MCP call yet):", message)`. The button then locks itself disabled, so the user believes a node was written. | Until `create_node` is wired from chat: label the button "Promote to node (not wired yet)" and disable it, or remove it. A false success state is worse than a missing feature on a product whose entire pitch is not asserting things. |
| `app/(reader)/s/[shareToken]/ShareClient.tsx:65` | "Shared read-only view (token {shareToken}) -- no editing, no chat." | Printing the token implies it was resolved and authorised. Line 26 is `loadWorkspace("ws-1")` unconditionally, so any string in the URL opens the same workspace. This is a security-shaped lie, not just a copy defect. | Drop the token from the copy: "Shared read-only view. No editing, no chat." Then file the resolution work (see §6). |
| `public/llms.txt:5` | "Every claim a generator writes carries at least one located anchor. Unlocated claims are visibly badged "quote located" ... versus "inference"" | Self-contradictory as written: sentence one says every claim is located, sentence two describes badging "unlocated claims" as "quote located". An LLM parsing this gets the tier semantics backwards, which is the one thing this file exists to prevent. | "Every claim a generator writes carries at least one anchor. A claim whose anchor cleared the deterministic fuzzy-match floor is badged "quote located" (score >= 0.92). A model-generated claim that has not been checked against a source is badged "inference". Neither is ever badged "verified"." |
| `public/llms.txt:14` | "[Discover](/discover): the public library of published papers and their graphs." | `/discover` filters a ~10-row hardcoded array in `lib/mock/discover.ts`. No paper has been published and no graph is reachable from a discover card. | "[Discover](/discover): a preview of the public library. Currently sample data; no papers have been published yet." |
| `app/(marketing)/legal/page.tsx:82-85` | "Only papers Pepiros is legally allowed to list ever show up in the public, curated library ... Anything you upload yourself stays private to your own workspace and is never added to the public catalog unless its license explicitly permits it." | Stated as an operative policy in a page headed "Legal". There is no library, no catalog, no license gate, and no per-workspace privacy boundary in code. A legal page is the worst place to describe an unimplemented control. | Rewrite in the future tense and say why: "When the public library opens, it will list only open-access and CC-licensed work. Uploads will stay private to your workspace unless their license permits listing. None of this is enforced in the current build, which runs on sample data." |
| `app/(app)/settings/page.tsx:134` | "Copy this token now, you won't be able to see it again." | The token is `pep_` + two `Math.random().toString(36)` slices (:76), held in React state, never persisted, and MCP has no auth layer to accept it. The warning teaches a user to store a string that does nothing. | Gate the whole tab: "MCP tokens are not live yet. Connect over stdio from a local clone; see the MCP page." Remove the generate button until there is a token to generate. |
| `app/(app)/settings/page.tsx:144` | "Generate one below to connect Claude to this account." | Same. There is no account-scoped MCP connection. | "Token-based MCP access is not available yet." |
| `app/(app)/home/page.tsx:129-137`, `app/(app)/analytics/page.tsx:28` | "{n} views this month", "{n} followers", "How much reach your published papers are getting." | Adapter-backed mock numbers rendered as the user's real analytics. | Label the surface once, at the top: "Sample data. Real analytics arrive with publishing." |

### HIGH

| file:line | current text | what is wrong | proposed replacement |
|---|---|---|---|
| `components/site/Hero.tsx:34-36`; also `how-it-works/page.tsx:213`, `mcp/page.tsx:242`, `SiteFooter.tsx:8` | "Try the demo workspace" / "Try the demo" | All four point at `/workspaces`, which `middleware.ts:16` protects. A signed-out visitor clicking the primary hero CTA is bounced to `/login`. The most important button on the site does not do what it says. | Either send it to `/login?next=/workspaces` and label it "Sign in to the demo" (`/login` already shows guest/guest at :118), or unprotect a read-only demo route. Do not leave a CTA that redirects. |
| `app/(marketing)/mcp/page.tsx:11` | "Call verify_claim to fact-check an agent's own output against a source, live, mid-conversation." | Breaks the product's own rule 2. "Fact-check" is exactly the claim the verifier does not make: it locates a quote, it does not adjudicate truth. This is the page `<meta description>`, so it is what search results and link previews say. | "Call `verify_claim` to check an agent's own output against a located quote, live, mid-conversation." |
| `app/(marketing)/page.tsx:196`, `app/(marketing)/mcp/page.tsx:133` | "Turn your coding agent into a fact-checker with a source." | The H1 on two pages. It is a good line and it contradicts the thesis on `how-it-works:33` ("A fuzzy-matched quote proves quotation provenance, not entailment"). "Fact-checker" promises entailment. Keeping both means the site argues with itself. | "Turn your coding agent into its own citation checker." Or, closer to the tagline: "Make your agent show its source." |
| `app/(marketing)/page.tsx:201`, `app/(marketing)/mcp/page.tsx:136`, `:231` | "Works with Codex, Claude, and Cursor today." | Said three times. "Today" is a compatibility claim. A stdio MCP server plausibly works with all three, but nothing in the repo shows it was run against all three, and `npx pepiros-mcp` (the documented path) works with none of them. | "Speaks stdio MCP, so it drops into Claude, Codex, or Cursor." Drop "today" until each is actually exercised, then say which were tested. |
| `public/llms.txt:5,11,13,19,20` | five em dashes | House rule 3 bans em dashes in all output. This file is the one a model reads verbatim and may reproduce. | Replace with commas, colons, or periods. Line 20's "more honest, quotation provenance" becomes "more honest: quotation provenance". |
| `components/canvas/InlineRefs.tsx:34`, `components/canvas/PaperNode.tsx:30`, `components/canvas/SynthesisNode.tsx:47` | `` `${tier}: "${preview}"` ``, "stale, source paper removed", "stale, a source paper was removed" | Three more em dashes, all in user-visible canvas strings. | Use a comma or colon: "stale, source paper removed". Note the last two also disagree with each other; pick one. |
| `public/llms.txt:18` | "call `search_paper`, `verify_claim`, `get_outline`, `get_node`, `create_node`, and `find_contradictions`" | Lists six of the eight real tools. `list_papers` and `paper_facts` are omitted, so an agent will not discover them. Undercounting is less damaging than `/mcp`'s overcounting, but it is still wrong. | Add `list_papers` and `paper_facts`. Keep this list and the `/mcp` grid generated from the same source so they cannot drift again. |
| `components/site/SiteFooter.tsx:69-70` | "Uploaded papers stay private to your workspace unless they're open-access or CC-licensed." | Reads as: if you upload an open-access paper, we will publish it. That is almost certainly not the intent (the `/legal` version at :83-85 says the opposite, gated on explicit permission), and neither behaviour is implemented. Contradiction between two pages on a privacy claim. | "Uploaded papers stay private to your workspace." Full stop. Let `/legal` carry the nuance. |
| `app/(platform)/discover/page.tsx:68` | "Curated open-access papers, plus what other researchers have published on Pepiros." | Nobody has published anything on Pepiros. The card grid is `mockPapers`. | "A preview of the public library, built from sample papers. Publishing opens later." |
| `app/(platform)/paper/[slug]/page.tsx:42-63` | Four fabricated comments attributed to "Priya S.", "jonasw", "Hana K.", "reviewer_anon" | Invented people with invented opinions, rendered on every paper page as a real discussion thread. On a product about provenance this is the worst possible placeholder. One of them (:50) even performs the product's own vocabulary back at the reader. | Replace with the real empty state: "No discussion yet." If a populated example is needed for the demo, label the block "Sample discussion" in the section kicker. |
| `app/(platform)/signup/page.tsx:43` | `router.push("/workspaces")` after "Create account" | No account is created (no fetch anywhere in the file), and `/workspaces` is auth-gated, so the user is immediately bounced to `/login`. The signup flow is a dead end that looks like a bug. | Route to `/login` with a note, or wire signup to the same endpoint `/login` uses. At minimum the button should not claim "Create account". |
| `app/(platform)/reset-password/page.tsx:52-54` | "If an account exists for {email}, a reset link is on its way." | No email is sent. The hedged phrasing is the correct security pattern, which makes it more convincing and therefore worse here. | Do not ship this page, or say "Password reset is not available in this build." |
| `app/(app)/welcome/page.tsx:92-95` | ""{workspaceName}" is set up. We'll drop you into a demo workspace with a few papers already loaded" | First half is false (nothing was created; the name is discarded), second half is true. The true half rescues it, but the sequence still reads as a successful creation. | "Workspace creation is not live yet. We'll drop you into a demo workspace with a few papers already loaded so you can see how the graph works." |
| `components/chat/ChatDock.tsx:15-20` | "What did the bright-light RCT actually find?", "Does the meta-analysis hold up under its own limitations?", "Where do the two papers disagree?", "What does neither paper establish?" | Excellent questions, hardcoded to the two fixture papers, shown in every workspace regardless of contents. The moment a real paper loads, these are nonsense. | Correct long-term fix is derivation (see §6). Short term the shapes generalise if the nouns are removed: "What did this paper actually find?", "Does it hold up under its own limitations?", "Where do these papers disagree?", "What does neither paper establish?" |
| `components/learn/QuizRunner.tsx:25-56` | Four questions naming "Okafor & Lindqvist, 2022", "Chen et al.", "Boateng (2023)", and citation ids C2/C5/C9/C7 | Hardcoded to fixture content and shown under a generic "Quiz" heading (`learn/page.tsx:36`) for any workspace. | Add a kicker on `/learn`: "Sample quiz, built from the demo workspace." Then file the generator. |

### MEDIUM

| file:line | current text | what is wrong | proposed replacement |
|---|---|---|---|
| `app/layout.tsx:27-28` | "A grounded research platform: every AI-surfaced claim stays bound to the exact quoted sentence it came from." | Site-wide `<meta description>`, OG description, and Twitter description. "Platform" is the ambition, not the build, and `page.tsx:238` deliberately demotes platform language on the landing page itself. The description also never uses the tagline. | "Be the source. Every AI-surfaced claim stays bound to the exact quoted sentence it came from." |
| `app/manifest.ts:13-14` | Same description string, duplicated | Duplicated rather than imported, so the two will drift. Tagline absent here too. | Export one `DESCRIPTION` constant and import it in both. |
| `app/manifest.ts:17-18` | `background_color: "#0d0e11"`, `theme_color: "#14161a"` | Both dark, but `app/layout.tsx:58-59` states day is the default theme. An installed PWA will flash dark on a light-default product. Not copy, but it is brand-surface consistency and it ships with the manifest. | Use the light surface tokens, or omit and let the browser follow the page. |
| `app/(marketing)/page.tsx:127` | "Grounding, not vibes" | Register break. Everything around it is restrained and unhurried; this is a social-media line. It is also the kicker on the most important trust section on the page, so the tone shift lands exactly where credibility is being built. | "What the badge means" or "Two tiers, always labeled" (already the H2 below it, so pick one and let the kicker be quieter, e.g. "Evidence"). |
| `app/(marketing)/how-it-works/page.tsx:185` | "Said on stage, not just in the docs" | Hackathon framing leaking into product copy. A reader who was not at the event does not know there was a stage. | "The part that usually goes unsaid" or simply "Limits". |
| `app/(marketing)/how-it-works/page.tsx:13`, `:55` | "Deterministic verification, not a model's opinion of itself." | "Verification" used as a bare noun is one inflection away from the banned "verified", and the page then spends four bullets explaining that it is not verification in the sense a reader assumes. The H1 sets up a claim the page walks back. | "Deterministic matching, not a model's opinion of itself." Then the limitations list reads as elaboration rather than retraction. |
| `app/(app)/posts/page.tsx:9,20,22`; `app/(app)/analytics/page.tsx:29` | "My posts", "Everything you have published, drafted, or archived.", "New post" | The `(app)` group calls papers "posts" throughout. Every other surface in the product calls them papers. This group was clearly written to a different brief and never reconciled. | "My papers", "Every paper you have published, drafted, or archived.", "Add a paper". |
| `app/(app)/home/page.tsx:38` vs `posts/page.tsx:22` vs `workspaces/page.tsx:39,61` | "Add a paper" / "New post" / "New workspace" | Three labels on three surfaces, all routing to `/upload`. "New workspace" is the worst of the three because `/upload` does not create a workspace. | Standardise on "Add a paper" everywhere it points at `/upload`. |
| `app/(app)/home/page.tsx:112` | "{n}% grounded" | Introduces a metric with no definition anywhere in the product. A reader cannot tell whether 60% grounded is good, and given the product's own care about what a score means, an undefined percentage is off-brand. | Either define it in a tooltip ("share of this paper's claims with a located quote") or drop it from the card. |
| `components/reader/CoverageOverlay.tsx` | "coverage" | A second undefined quantitative concept, adjacent to the first. Two unexplained metrics on a product built around explaining exactly what a number means. | Define both in one place, or expose only one. |
| `app/(platform)/login/page.tsx:74` | "Pick up your workspaces and your published papers." | Published papers do not exist for any user. | "Pick up where you left off." |
| `app/(app)/settings/page.tsx:235` | Badge "demo, no data is actually deleted" | This is the right instinct and the only place in the product that does it. Its isolation makes every unlabeled mock elsewhere read as real by contrast. | Keep it, and promote the pattern: use the same badge on `/home`'s Continue reading card, `/analytics`, `/comments`, and the discover grid. |
| `app/(reader)/w/[workspaceId]/audit/AuditClient.tsx:79` | "Drop rate" stat | Internal evaluation vocabulary ("plant one misattribution, measure drop rate") surfaced as a user-facing KPI with no explanation. A reader seeing "Drop rate 12%" cannot tell whether that is the system working or failing. | "Anchors dropped" with a one-line caption: "Claims whose quote did not clear the match floor. A non-zero number here is the verifier doing its job." |

### LOW

| file:line | current text | what is wrong | proposed replacement |
|---|---|---|---|
| `components/ui/Logo.tsx:137` | "Be the source." | Rendered `font-mono text-[10px] uppercase tracking-widest`. The brand kit sets the tagline in serif italic at ~half the wordmark size (`design/PEPIROS-BRAND/logos/.../lockup-mono-dark.svg`). The site's own lockup does not match the kit's. Also `design/DIRECTIONS.md:53` still records the tagline as unreconciled, which is now stale. | Serif italic to match the kit. Update `DIRECTIONS.md:53`, the reconciliation happened. |
| `components/ui/Logo.tsx` (usage) | tagline rendered only in `SiteFooter.tsx:46` | The tagline is the brand line and appears once, in the footer, at 10px. It is absent from the hero, all metadata, and the manifest. | Put it in `app/layout.tsx` description and consider it under the hero wordmark. |
| `app/(platform)/discover/page.tsx:125` | "That's every paper" | Disabled-button label doing double duty as a status message. Slightly cute against the house register. | "No more papers" |
| `app/(reader)/w/[workspaceId]/audit/AuditClient.tsx:47`, `components/inspector/NodeInspector.tsx:84`, `app/(reader)/s/[shareToken]/ShareClient.tsx:50` | "Loading workspace...", "Loading workspace...", "Loading shared workspace..." | ASCII triple-dot, while `components/chat/ChatDock.tsx:165,204` and `login/page.tsx:108` use the ellipsis character. Two conventions in the same product. | Pick the ellipsis character and normalise. |
| `app/(marketing)/legal/page.tsx:61-62` | "do nearly anything with the code, keep the copyright notice, no warranty is offered" | Good plain-English summary. "nearly anything" is vaguer than MIT actually is. | "use, modify, and redistribute it, including commercially, as long as you keep the copyright notice. No warranty." |
| `app/not-found.tsx:15-17` | "This page isn't part of the graph." / "Nothing here, no paper, no workspace." | Nothing wrong. Noting it as the tonal benchmark: quiet, on-metaphor, no apology. Other error copy should match this. | No change. |

---

## 3. Voice inconsistencies

**Three registers are running at once.**

1. *Editorial Paper*, the intended one. `/how-it-works` end to end, `app/not-found.tsx`, `SiteFooter`'s bottom strip, `login/page.tsx:117-121`. Restrained, concrete, declines to oversell. This is the product's voice and it is good.
2. *Pitch deck.* "Grounding, not vibes" (`page.tsx:127`), "Turn your coding agent into a fact-checker" (`page.tsx:196`), "Said on stage, not just in the docs" (`how-it-works:185`), "Works with ... today" (three places). Louder, and it is concentrated in exactly the sections making the strongest claims.
3. *Generic SaaS dashboard.* The whole `(app)` group. "My posts", "Everything you have published, drafted, or archived.", "How much reach your published papers are getting." Could be any content tool. No trace of the grounding thesis.

**Over-hedged where the product is strong.** `/about:70-75` and `how-it-works:32-37` both explain the fuzzy-match limitation, well, and then `/legal:105-108` explains it a third time. Three explanations of one honest limitation reads as anxiety. One canonical statement plus links would read as confidence.

**Over-sold where the product is weakest.** The inverse of the above, and this is the core pattern. Verification copy is careful to the point of repetition; ingest, publishing, the library, tokens, and analytics are all stated flatly in the present tense with no hedge at all. The care was spent where it was easy.

**Present tense as the default failure mode.** `PLATFORM_PREVIEW` (`page.tsx:19-22`), `upload:159`, `upload:255`, `legal:82-85`, `discover:68`, `settings:134`. The landing page's own section heading, "Where this is going" (`page.tsx:238`), is the correct frame and the four bullets underneath it immediately break it.

**Second person drifts.** "We build the grounding graph from there" (`upload:159`) is the only first-person-plural sentence in the product. Everywhere else the system is named ("Pepiros is...") or the sentence is impersonal ("Every claim ... stays bound"). Pick one; the impersonal register suits the direction better.

**Honesty labelling is applied once and then abandoned.** `settings:235`'s "demo, no data is actually deleted" is the only inline disclosure in the app. `PromoteButton` claims success, `ShareClient` prints a token it never resolved, `/home` shows a fabricated reading position, and none carry a comparable label.

---

## 4. Terminology register

Canonical term on the left. Everything on the right is currently in use and should normalise to it.

| Canonical | Variants currently in the codebase | Note |
|---|---|---|
| **quote located** | "verified" (banned), "fact-check" (`mcp:11`), "fact-checker" (`page:196`, `mcp:133`), "confirmed" | Rule 1. `EvidenceBadge.tsx:5` is correct and is the source of truth. Two marketing strings break it. |
| **inference** | "model output" (`page:166`), "not yet checked" (`page:164`), "ungrounded" (`ChatDock`, `ErrorBanner` variant), "unverified" (`llms.txt:19`) | Four names for one tier. "ungrounded" is a separate concept in the chat response shape (`ChatApiResponse.ungrounded`) and should not be used as a synonym for the inference badge. |
| **unsupported** | "dropped" (`AuditClient:92`), "stale" (`AuditClient:87`, `PaperNode:30`), "resolved unsupported" (`NodeInspector:43`) | The tier is `unsupported`. "Dropped" describes what happened to the anchor, not the tier; keep the two separate and say so once. |
| **anchor** | "citation" (`welcome:60`), "evidence" (`AuditClient:74`), "located anchor" (`llms.txt:5`), "ref" (`RefChip`) | Four words for the claim-to-quote binding, all user-visible. Suggest: *anchor* for the binding, *citation marker* for the `[^e1]` token, *evidence row* for the record. |
| **paper** | "post" (all of `(app)/posts`, `(app)/analytics`), "document" | `(app)` group is the sole offender and should be swept. |
| **workspace** | "reading graph" (`settings:203`), "graph" (`GraphPreviewCard`), "library" (`ReaderClient:138` breadcrumb) | The breadcrumb "Library > {workspace} > {paper}" introduces a fourth level of hierarchy that exists nowhere else in the copy. |
| **graph canvas** | "canvas" (`ReaderClient:158` "Explore graph"), "citation graph" (`ReaderClient:22`), "knowledge graph" (`llms.txt:3`), "pillar-organized graph" (`page:103`) | Pick one public name. "Graph" alone is fine; the modifiers each imply a different thing. |
| **pillar** | "section" (`SectionNav`), "topic" (`topicLabelForPillar`) | `pillar` is the product's own coinage and is explained nowhere in user-facing copy. It needs one definition on `/how-it-works` or it should be renamed to "section". |
| **match score** | "fuzzy-match score" (`how-it-works:13`), "score" (`how-it-works:134`), "token_set_ratio" (code comments) | "match score" in UI, thresholds spelled out once on `/how-it-works`, algorithm name in docs only. |
| **entailment overlap floor** | "entailment-overlap floor" (`page:176`), "entailment floor" (`how-it-works:41` comment), "numeric ledger" (`mcp:92`, `AuditClient` column "Numeric") | Three names, one of which ("numeric ledger") is a data structure, not the check. |
| **quote located / paraphrase / unsupported** | tier order and thresholds stated in `how-it-works:127`, `llms.txt:19`, `mcp:71` | These three agree. Good. Keep them generated from one constant so they stay agreeing. |
| **Be the source.** | absent from `app/layout.tsx`, `app/manifest.ts`, and every H1 | The tagline appears in the brand kit, the footer lockup, and `design/PEPIROS-BRAND/web/site.webmanifest`, but not in the app's own manifest or metadata. |

---

## 5. Gaps

### Pages that do not exist

None of `/privacy`, `/terms`, `/security`, `/status`, `/docs`, `/faq`, `/roadmap`, `/changelog` exist as routes. `/legal` partly covers license, data sources, and disclaimers, but it is not a privacy policy and not terms of service.

- **`/privacy`** is the sharpest gap. `signup/page.tsx` collects a name, an email, and a password with no privacy link anywhere on the form, and `upload/page.tsx` takes a file. Needed content: what is stored, whether uploaded PDFs are retained, that chat questions are sent to a third-party model provider (Groq), and that no analytics vendor is present if that is true.
- **`/terms`** needed before any account creation ships. `/legal`'s disclaimer section (`:101-114`) is a good start but is framed as a research-prototype note, not as terms.
- **`/security`** should exist so `contact/page.tsx:42` stops directing web visitors to a filename. `SECURITY.md` already has the content; the page is a render of it plus a contact route.
- **`/status`** is optional at this stage, but the product currently has no honest place to say "ingest is not live, chat needs a key, export is stubbed". That sentence belongs somewhere linkable, and `/status` is the natural home. This would also give every "not built yet" string a place to point.
- **`/docs`** referenced by nothing yet, but `/mcp` currently carries install instructions, transport notes, and a tool reference in a marketing page. That reference will grow and should move.
- **`/faq`** would absorb the three duplicate explanations of the fuzzy-match limitation currently spread across `/`, `/how-it-works`, and `/about`.
- **`/roadmap`** would let `PLATFORM_PREVIEW` (`page.tsx:18-23`) stop lying in the present tense; the four items become roadmap entries with honest tense and a link.
- **`/changelog`** `CHANGELOG.md` exists at repo root (21KB) with real content and is not surfaced anywhere on the site.

### Empty states missing

Present and good: `discover` no-results (`:104-108`), `workspaces` empty (`:35-40`), `settings` no tokens (`:141-145`), `comments` empty (`:41-46`), `u/[username]` no papers (`:102`).

Missing entirely:

- **Workspace with zero papers.** `ReaderClient` assumes `workspace.papers[0]` exists (`:53-57`); with an empty array it renders a skeleton forever.
- **Paper with zero anchored claims.** No copy for a paper whose every claim came back `unsupported`, which is the outcome the product most needs to narrate well.
- **Audit with zero evidence.** `AuditClient` renders an empty table and a "0%" drop rate with no explanation.
- **Chat with no relevant chunks.** The refusal path exists (`ChatDock:177-190`, "Answer without sources") but there is no copy explaining *why* it refused. A user sees a button with no preceding sentence.
- **Flashcards or quiz with no leaf nodes.** `learn/page.tsx` renders both components unconditionally.
- **Related papers rail with zero results.** Semantic Scholar returning nothing is a normal outcome; no copy covers it.
- **Discover with zero papers overall** (as opposed to zero search matches), which is the true current state.

### Error states missing

- **Ingest rejections.** `upload/page.tsx:127` renders `body?.detail` straight from the API, falling back to "Upload failed ({status})." The interesting rejections (scanned PDF with no text layer, over the page cap, duplicate) deserve written copy with a next action, not a passthrough. The file's own comment at `:258-259` says the reason "is the useful part" and then does not write one.
- **`501` from stubbed routes.** `lib/api/notImplemented.ts:12` returns `{"error":"not_implemented"}` with no `detail`, so any caller falls through to a bare status-code string. `/api/export`, `/api/chat/promote`, `/api/nodes/*` all use it.
- **Chat provider failure vs missing key.** Only the missing-key case has copy (`ChatDock:82`, and it is the wrong copy, see BLOCKER above). A rate limit or an upstream 500 shows raw `detail`.
- **Offline.** `OfflineBanner` is mounted in `app/layout.tsx:69` for every route; its copy was not part of any reviewed pass.
- **PDF fails to render.** `PdfPane` has no failure copy.

### Loading states

`ReaderClient:79-93` has a well-shaped skeleton, but every other loading path is a bare sentence in three different phrasings (see LOW findings). There is no copy for the long ingest wait, which is the one place where a pacing narrative was designed (`PacingStrip`) and is not wired to anything real.

### One thing the site never says

Nowhere does any user-visible surface state that this build runs on a fixture and that no PDF has been processed. Every honest caveat is scoped to one feature. A single sentence, in the footer or on `/status`, would do more for credibility than the twelve individual hedges proposed above, and would let several of them stay short.

---

## 6. Issues to file for Yash

Each of these is a place where softening the sentence is the wrong fix and building the thing is the right one. Titles and one-line bodies, ready to paste.

**`fix(mcp): register the four missing workspace and ingest tools`**
`/mcp` advertises `list_workspaces`, `create_workspace`, `add_paper`, and `get_job`; `mcp/tools/index.ts` registers none of them, so the page is either wrong or the tools are missing.

**`feat(mcp): publish a runnable install path for the MCP server`**
`npx pepiros-mcp` cannot resolve because `package.json` is `private: true` with no `bin` field; either publish the package with a bin entry or the install copy has to change.

**`feat(ingest): wire the PDF parse pipeline behind POST /api/ingest`**
Upload validates and queues but nothing parses, so every "we build the graph from there" string on the site is currently unbacked.

**`feat(share): resolve share tokens instead of always loading ws-1`**
`ShareClient` ignores the token in the URL and loads the fixture workspace unconditionally, so any share link opens the same data regardless of token.

**`feat(chat): wire Promote to node through create_node`**
`PromoteButton` logs to the console and then renders "Promoted to graph", which is a false success state in a product whose pitch is not asserting things.

**`feat(export): implement GET /api/export for markdown and BibTeX`**
The route returns 501 from `notImplemented`, and there is no export affordance in the UI to match the capability the plan describes.

**`feat(synthesis): implement the contradiction synthesis pass`**
`lib/services/synthesis.ts` is two TODO lines, so `find_contradictions` has no synthesis behind it and the cross-paper story on `/mcp` has no engine.

**`feat(chat): derive suggested questions from the loaded paper`**
The four suggestions in `ChatDock` are hardcoded to the two fixture papers and will be nonsense for any real upload.

**`feat(learn): generate quiz questions and flashcards from real nodes`**
`QuizRunner` ships four questions naming fixture authors and citation ids; flashcards are synthesised at render with no persistence.

**`feat(auth): make signup create an account`**
`/signup` validates, creates nothing, and pushes to an auth-gated route, so a new user is bounced straight to `/login`.

**`feat(auth): implement password reset, or remove the route`**
`/reset-password` tells the user a link is on its way and sends no email.

**`feat(settings): back MCP tokens with real issuance and verification`**
Generated tokens are `Math.random()` strings held in React state, and MCP has no auth layer that would accept one.

**`feat(app): replace mock reading position and analytics with real data`**
`/home`'s Continue reading card and the reach strip are hardcoded or adapter-mocked and render as the signed-in user's own state.

**`feat(platform): make the demo workspace reachable without signing in`**
Four CTAs say "Try the demo workspace" and all four redirect to `/login` because `middleware.ts` protects `/workspaces`.

**`feat(discover): back the library with real published papers`**
`/discover`, `/paper/[slug]`, and `/u/[username]` all read `lib/mock/*`, including four fabricated named comments rendered as real discussion.

**`chore(mcp): generate the tool list on /mcp and in llms.txt from one source`**
The page says twelve, `llms.txt` names six, and the server registers eight; three hand-maintained lists guarantee they drift again.

**`feat(site): add /privacy, /terms, and /security`**
Signup collects an email and upload accepts files with no privacy policy or terms anywhere, and `/contact` currently points web visitors at a `SECURITY.md` filename they cannot open.

**`feat(ingest): stream real pacing progress to the upload view`**
`PacingStrip` publishes five specific latency figures as observed behaviour with no pipeline behind them to measure.
