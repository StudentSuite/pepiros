# Pepiros

*User Manual*

PROJECT DOCUMENTATION

**Version:** 0.1.1  
**Live site:** pepiros.vercel.app  
**Prepared:** 24 August 2026  

---

## 1. Getting started

### 1.1 Without an account

The reader and the upload form are both open to a signed-out visitor. A banner states plainly what happens to anything added this way: questions asked in chat disappear when the browser tab closes, and a paper added is saved to the shared demo workspace rather than to a private account of the visitor's own, since there is not yet a per-account workspace to save it to.

### 1.2 With an account

Sign up with a username, a real email address (used for password recovery and confirmation), and a password, or sign in with Google. A guest demo account (`guest` / `guest`) is also available and is pre-populated with real content -- nothing done inside that shared account persists, and its settings/danger-zone controls are disabled for the same reason.

## 2. Adding a paper

1. Go to **Add a paper**.

1. Either upload a PDF file directly, or paste an arXiv, PMC, or direct-PDF URL. (A DOI link needs an open-access resolver step and can fail if no free copy is found.)

1. The form validates the file before anything else runs: it must actually be a PDF (checked by magic bytes, not just the file extension), under 50MB, under 120 pages, and have a real text layer rather than being a scanned image with no extractable text. A rejection names the specific problem rather than a generic failure.

1. A live, stage-by-stage progress view follows the real ingest pipeline: parsing, classification, pillar planning, then each claim generator, then verification. Nothing here is a fixed-duration animation -- it reflects the pipeline's own real events.

1. Once ingest finishes, the paper opens in the reader automatically.

## 3. The reader

The default landing view for any workspace. The source PDF (or, for the bundled demo papers with no stored PDF file, a styled mock of the same page) sits beside a stack of claims grouped by pillar (theme). Selecting a claim highlights its exact source rectangle on the page; selecting a highlighted rectangle on the page selects the claim it backs.

- Each claim shows its evidence tier as a badge: **quote located**, **paraphrase**, or **unsupported**, plus the match score and page number.

- A coverage gutter along the page edge shows, at a glance, how much of the visible page is actually anchored by evidence.

- Selecting text in the source pane offers two actions: jump to whichever claim already cites that passage, or ask a question about the selection directly.

- A chat panel (collapsed to a small button by default) answers a question using the workspace's own claim graph. An answer that cannot clear the grounding floor is visually marked as ungrounded, with an explicit "answer without sources" option rather than silently presenting it as sourced.

## 4. The canvas

Reached from the reader via an explicit "Explore graph" action -- the canvas is never the first thing a new reader sees. It renders the same claim graph as a zoomable, pannable node-and-edge diagram (built on React Flow):

- **Paper** nodes are the root of each paper's subtree.

- **Pillar** nodes are the paper's own themes; they start collapsed, and a click expands or collapses the claims underneath.

- **Claim** (leaf) nodes are individual generated claims, each showing its weakest cited evidence tier.

- **Synthesis** and **reading-path** nodes span more than one paper -- a synthesis node is a finding drawn across papers (agreement, contradiction, or extension); a reading-path node is a suggested route through several papers' claims.

Edges are colored and dashed by relation kind (agrees, contradicts, extends, shares method, relates, cites, or the structural "contains" tree), with a legend explaining every color and dash pattern the canvas actually uses. Zooming out sheds each card's detail in stages, so a wide graph reads as overall shape rather than a wall of unreadable text.

A one-click action can also expand a paper's real citation graph outward (via OpenAlex): papers that cite it, or that it cites, appear as dimmed "ghost" nodes at the canvas edge, each with a one-click "add to workspace" action.

## 5. Outline, audit, and learn views

### 5.1 Outline

A plain nested list of the same paper -> pillar -> claim tree the canvas renders, for accessibility and as a fallback if the canvas is hard to use on a given device.

### 5.2 Audit

Every claim in the workspace, listed with its evidence tier and an overall drop rate (the share of claims whose citation failed re-verification). A separate reverse-audit tool on this same tab accepts an already-written summary -- for example, one an AI produced elsewhere -- and checks it sentence by sentence against the workspace's own source text, exactly the same way a generated claim is checked.

### 5.3 Learn

Flashcards and a short quiz, both generated only from claims that already cleared the quote-located tier -- there is no separate, unverified content generation path for this view. No spaced-repetition scheduling is implemented; cards and questions are presented in a fixed order.

## 6. Cross-paper synthesis

Once a workspace holds more than one paper, running a comparison writes real relation edges between claims across papers (agrees, contradicts, extends, shares method, relates) and, where the evidence supports it, one of four synthesis node types: Consensus, Contradictions, Timeline of Findings, or Methodological Divergence. A contradiction is only recorded when both sides of it have their own located quote -- a one-sided disagreement is not treated as evidence of anything.

## 7. Sharing a workspace

A share link opens a read-only view of a workspace: the same source pane and node inspector, no chat, and no editing controls. An invalid or expired share link shows a clear dead-end page rather than a blank error.

## 8. Discovering and reading public papers

The public catalog and discover feed list open-access papers only (arXiv, PMC open-access, and CC-BY licensed work) -- a paywalled or license-unverified paper is never presented as open access. Each catalog entry links to its real source and, where the weekly indexing job has already processed it, to its own real claim graph and mindmap.

A per-paper mindmap view renders the same verified pillar/claim structure as an interactive, zoomable mind map (via Markmap), colored to match the same pillar hues the canvas uses for that paper. It is a rendering of already-verified data, not a second, separate AI pass over the paper.

## 9. Account settings

- **Profile**: display name and bio.

- **Security**: password change, and "sign out everywhere," which revokes every active session for the account server-side, not just the current browser's cookie.

- **MCP tokens**: mint and revoke tokens for connecting an external AI agent to this specific account's workspaces, scoped to read-only or read-and-write, and optionally pinned to a single workspace.

- **Notifications**: preferences for what triggers an email.

- **Danger zone**: permanent account deletion, gated behind typing the account's own username to confirm.

None of the above settings can be changed from the shared guest demo account; every one of those write paths is rejected server-side, not merely hidden in the interface.

---

## 10. Using Pepiros as a connected AI agent

This is the feature that extends Pepiros beyond a website: any MCP-compatible AI agent (Claude Desktop, Claude Code, or another MCP client) can connect and call the same grounding spine a human reader sees rendered in the UI. See the Installation and Setup Guide for the exact connection steps, and the Technical Reference for the full list of callable tools.

A typical session:

1. The agent is asked to summarize a paper already in a workspace. It calls `search_paper` to find the relevant chunks and cites their stable ids in its answer, rather than inventing one.

1. Asked to "verify every claim you just made," the agent calls `verify_claim` on each of its own sentences and reports back which ones the source actually supports -- deterministically, the same fuzzy match and entailment floor the web UI uses, not a second model's opinion.

1. If the agent wants the audited result to persist, it calls `create_node` to write it into the graph. The server re-verifies the submitted evidence itself; the agent cannot assert that a quote is `quote_located` and have that assertion trusted.

A result returned to an agent also includes a deep link back into the reader or canvas, since the agent itself has no way to render the graph -- text and a link are the whole interface on that side.
