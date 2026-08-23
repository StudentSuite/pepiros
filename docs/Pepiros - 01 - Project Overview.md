# Pepiros

*Project Overview: purpose, audience, and features*

PROJECT DOCUMENTATION

**Version:** 0.1.1  
**Repository:** github.com/StudentSuite/pepiros  
**Live site:** pepiros.vercel.app  
**License:** MIT  
**Prepared:** 24 August 2026  

---

## 1. What Pepiros is

Pepiros turns a research PDF into a living knowledge graph where every generated claim is bound to a located quote in the source document, and exposes that grounding as a callable service an AI agent can call over the Model Context Protocol (MCP).

The core proposition is a deterministic verification spine, not a second model judging the first one's output. When a claim is generated, its cited quote is checked against the source text with a fuzzy string match (`token_set_ratio`), plus an entailment-overlap floor that checks every number, unit, and comparator the claim asserts also appears in the anchored passage. No LLM ever grades another LLM's claim.

That check produces one of three tiers, and the product's central rule is that none of them is ever called "verified":

- **Quote located** -- the quote scored 0.92 or above against the source text. Page, rect, and match score are all shown.

- **Paraphrase** -- scored between 0.75 and 0.92. Close to the source wording, not verbatim, still badged and kept.

- **Unsupported** -- scored below 0.75. The anchor is dropped and the citation marker is stripped from the claim's text.

A fourth label, **inference**, marks a claim with no checked excerpt behind it at all -- the model wrote it and nothing has verified it yet. The distinction matters because a fuzzy-matched quote proves *quotation provenance*, not *entailment*: a model can attach a real sentence from a paper's Methods section to a conclusion the paper never draws, and a naive similarity check would still score it as a perfect match. Pepiros renders the claim and its quote side by side so a human reader adjudicates that gap, rather than asserting it away.

## 2. The problem it addresses

Tools that summarize a research paper, or an AI agent asked to describe one, routinely ask the reader to simply trust the summary. When a citation is wrong, invented, or attached to the wrong sentence, there is normally no fast way to check it against the original text without opening the PDF and searching by hand.

Pepiros closes that loop specifically for AI-agent workflows: an agent connected over MCP can call `verify_claim` on its own generated sentence mid-conversation, get back a real tier and match score, and say so before the answer is finished -- rather than a person discovering the error after the fact.

## 3. Target audience

- **Researchers and students** reading primary literature who want a faster way to get a paper's structure and key claims without losing the ability to check any one of them against the source sentence.

- **Developers building AI agents** (in Claude, Claude Code, or any MCP-compatible client) who need a grounding tool their agent can call to check its own citations against real source text, rather than trusting an LLM's self-report.

- **Teams evaluating a paper together**, using cross-paper synthesis (agreement/contradiction/extension edges) and a reverse-audit tool that checks an already-written summary sentence by sentence against the source.

The product is explicitly not aimed at fact-checking the underlying research itself -- a "quote located" badge says a cited sentence exists at the stated page, not that the paper's science is correct, current, or complete. That distinction is stated on the product's own Terms and FAQ pages.

## 4. Main features

### 4.1 Ingest and grounding

- Upload a PDF, or paste an arXiv / PMC / DOI link. The pipeline extracts sections, chunks, figures, equations, references, and numeric statistics, then classifies the paper's archetype (RCT, cohort study, systematic review, and seven others) and drafts a set of thematic "pillars" with claims underneath each.

- Every generated claim's citation is deterministically re-verified against the source before it becomes a real evidence row -- the grounding spine never trusts a model's own assertion, including a claim submitted through the MCP `create_node` tool.

- Multi-span anchors: an aggregate claim ("three of four trials used open-label dosing") can be backed by more than one located rectangle on the page, not just a single contiguous sentence.

### 4.2 Reading and exploration surfaces

- A doc-reader view: the claim and its source quote render side by side, with the PDF page highlighted at the exact anchored rectangle.

- A citation-graph canvas (built on React Flow): five node types (paper, pillar, claim, cross-paper synthesis, reading path), edges colored and dashed by relation kind (agrees, contradicts, extends, shares method, relates, cites), and a level-of-detail system that sheds card detail as the view zooms out.

- An outline view (a plain nested list of the same graph, for accessibility and as a fallback), an audit view (every claim with its tier and a computed drop rate), and a learn view (flashcards and a quiz, both derived only from claims that already cleared the quote-located tier -- never synthesized separately).

- Cross-paper synthesis: once a workspace holds more than one paper, real agrees / contradicts / extends / shares-method / relates edges are computed between claims, plus four kinds of synthesis nodes (Consensus, Contradictions, Timeline of Findings, Methodological Divergence).

### 4.3 Grounded chat

- A chat interface answers a reader's question using the workspace's own claim graph, citing sources inline. An answer that cannot clear the grounding floor is visually marked ungrounded rather than silently presented as sourced, with an explicit opt-in to see an unsupported answer anyway.

### 4.4 MCP server for AI agents

- A published npm package (`pepiros-mcp`) exposes 12 live tools over stdio, installable with a single `npx -y pepiros-mcp` in any MCP-compatible client (Claude Desktop, Claude Code, Cursor).

- A remote, OAuth 2.1-secured streamable-HTTP transport is also live for hosted connectors that can only reach a URL rather than spawn a local process.

- Every write path re-verifies server-side: a connected agent can request that a claim be recorded as `quote_located`, but the server checks the quote itself and downgrades or drops the anchor if it does not actually clear the threshold.

### 4.5 Accounts and the public platform layer

- Real username/password accounts (with email verification and recoverable passwords) plus Google sign-in, server-side revocable sessions, and a public catalog of open-access papers (arXiv, PMC-OA, and CC-BY licensed work only -- never a paywalled or unverified-license paper served as open access).

- A guest mode requires no account: the reader and upload are open to an unauthenticated visitor, with an explicit, honest banner about what is and is not kept.

## 5. Current state, stated plainly

This is an early-stage, two-person build that moves fast; the project's own README and status page maintain a running, honest "working / partly built / not built yet" breakdown rather than presenting every surface as finished. As of this writing the deterministic grounding spine, the reader and canvas UI, the MCP server (both stdio and remote transports), grounded chat, and account/session handling are all real and tested. Remaining gaps -- OCR for scanned PDFs, two synthesis node types that need signals nothing in the pipeline extracts yet, and session refresh -- are each documented at the top of the file they belong in, not hidden.

See the accompanying Technical Reference and the project's own `/status` page for the specific, current breakdown.

---

## Document index

| Document | Covers |
| --- | --- |
| 01 -- Project Overview | This document: purpose, audience, features, current state |
| 02 -- Installation and Setup Guide | Prerequisites, environment configuration, running locally, running the MCP server |
| 03 -- User Manual | How to use every surface of the product, as a reader and as a connected AI agent |
| 04 -- Technical Reference | Architecture, full data model, full MCP tool reference, configuration reference, API surface |
