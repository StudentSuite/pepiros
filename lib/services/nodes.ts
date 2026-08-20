import "server-only";
import type { Evidence, GraphEdge, GraphNode, Workspace } from "@/types/anchor";
import { verifyAndBindClaims, reverifyNodeEvidence } from "./verify";
import { fetchWorkspace } from "./workspace";
import { deleteIngestedNode, getIngestedWorkspace, recordNodeVersion, setIngestedWorkspace } from "./ingestStore";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import { GENERATORS, runGenerator } from "@/lib/agents/generators";
import { UserFacingError } from "@/lib/errors";

/**
 * Node reads/writes for the MCP surface and `app/api/nodes/*`
 * (docs/PLAN-V1.md §13.2). Enforces the §4.6 invariants at the boundary
 * rather than trusting callers -- an MCP client is untrusted input.
 *
 * Every returned shape carries the verbatim quote, page, and a deep link,
 * because §13.2 is explicit that Claude cannot see the canvas: text plus link
 * is the entire interface.
 */

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function nodeDeepLink(workspaceId: string, nodeId: string): string {
  return `${appUrl()}/w/${encodeURIComponent(workspaceId)}/canvas?node=${encodeURIComponent(nodeId)}`;
}

// --- get_outline ----------------------------------------------------------

export interface OutlineLeaf {
  nodeId: string;
  title: string;
  evidenceCount: number;
  deepLink: string;
}

export interface OutlinePillar {
  nodeId: string;
  title: string;
  leaves: OutlineLeaf[];
}

export interface OutlinePaper {
  paperId: string | null;
  nodeId: string;
  title: string;
  pillars: OutlinePillar[];
}

export interface Outline {
  workspaceId: string;
  papers: OutlinePaper[];
  crossPaper: OutlineLeaf[];
  /** Compact indented text tree -- §13.2 wants text, not canvas JSON. */
  text: string;
}

/** Children of `parentId` via `contains`, which §4.6 guarantees is a strict tree. */
function containedChildren(workspace: Workspace, parentId: string): GraphNode[] {
  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n] as const));
  return workspace.edges
    .filter((e) => e.kind === "contains" && e.sourceId === parentId)
    .map((e) => nodeById.get(e.targetId))
    .filter((n): n is GraphNode => Boolean(n));
}

function countEvidence(workspace: Workspace, nodeId: string): number {
  return workspace.evidence.filter((e) => e.nodeId === nodeId).length;
}

export async function getOutline(workspaceId: string): Promise<Outline> {
  const workspace = await fetchWorkspace(workspaceId);

  const papers: OutlinePaper[] = workspace.nodes
    .filter((n) => n.type === "paper")
    .map((paperNode) => ({
      paperId: paperNode.paperId,
      nodeId: paperNode.id,
      title: paperNode.title,
      pillars: containedChildren(workspace, paperNode.id)
        .filter((n) => n.type === "pillar")
        .map((pillarNode) => ({
          nodeId: pillarNode.id,
          title: pillarNode.title,
          leaves: containedChildren(workspace, pillarNode.id)
            .filter((n) => n.type === "leaf")
            .map((leafNode) => ({
              nodeId: leafNode.id,
              title: leafNode.title,
              evidenceCount: countEvidence(workspace, leafNode.id),
              deepLink: nodeDeepLink(workspaceId, leafNode.id),
            })),
        })),
    }));

  // synthesis/thread nodes hang off derived_from/relates, not contains, so
  // they are not reachable from any paper's subtree -- they belong to the
  // workspace, and the outline would silently omit them otherwise.
  const crossPaper: OutlineLeaf[] = workspace.nodes
    .filter((n) => n.type === "synthesis" || n.type === "thread")
    .map((n) => ({
      nodeId: n.id,
      title: n.title,
      evidenceCount: countEvidence(workspace, n.id),
      deepLink: nodeDeepLink(workspaceId, n.id),
    }));

  const lines: string[] = [];
  for (const paper of papers) {
    lines.push(paper.title);
    for (const pillar of paper.pillars) {
      lines.push(`  ${pillar.title}`);
      for (const leaf of pillar.leaves) {
        lines.push(`    ${leaf.title} (${leaf.evidenceCount} evidence)`);
      }
    }
  }
  if (crossPaper.length > 0) {
    lines.push("Cross-paper");
    for (const node of crossPaper) {
      lines.push(`  ${node.title} (${node.evidenceCount} evidence)`);
    }
  }

  return { workspaceId, papers, crossPaper, text: lines.join("\n") };
}

// --- get_node -------------------------------------------------------------

export interface ResolvedEvidence {
  evidenceId: string;
  refId: string;
  tier: Evidence["tier"];
  matchScore: number;
  numericOk: boolean | null;
  quote: string | null;
  page: number | null;
  deepLink: string;
}

export interface ResolvedNode {
  nodeId: string;
  type: GraphNode["type"];
  title: string;
  bodyMd: string;
  paperId: string | null;
  stale: boolean;
  deepLink: string;
  evidence: ResolvedEvidence[];
}

/**
 * Issue #181: split out of getNode() below so a caller that already has a
 * fetched Workspace in hand (mcp/resources.ts's node resource) can resolve
 * a node from it directly, instead of calling fetchWorkspace() a second
 * time just to get an id it already had -- a full data read plus a full
 * computeLayout() pass, twice, to serve one node lookup.
 */
export function resolveNodeFromWorkspace(workspace: Workspace, nodeId: string): ResolvedNode | null {
  const node = workspace.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const chunkById = new Map(workspace.chunks.map((c) => [c.id, c] as const));

  const evidence: ResolvedEvidence[] = workspace.evidence
    .filter((e) => e.nodeId === nodeId)
    .map((e) => {
      const chunk = e.anchor ? chunkById.get(e.anchor.chunkId) : undefined;
      return {
        evidenceId: e.id,
        refId: e.refId,
        tier: e.tier,
        matchScore: e.matchScore,
        numericOk: e.numericOk,
        quote: e.anchor?.quote ?? null,
        // A dropped anchor has no page to point at. Reporting null is the
        // honest answer; inventing the chunk's page would imply a located
        // quote where the verifier decided there wasn't one.
        page: chunk?.page ?? null,
        deepLink: nodeDeepLink(workspace.id, nodeId),
      };
    });

  return {
    nodeId: node.id,
    type: node.type,
    title: node.title,
    bodyMd: node.bodyMd,
    paperId: node.paperId,
    stale: node.stale,
    deepLink: nodeDeepLink(workspace.id, node.id),
    evidence,
  };
}

export async function getNode(workspaceId: string, nodeId: string): Promise<ResolvedNode | null> {
  const workspace = await fetchWorkspace(workspaceId);
  return resolveNodeFromWorkspace(workspace, nodeId);
}

// --- create_node ----------------------------------------------------------

export interface CreateNodeClaim {
  refs: string[];
  quote: string;
}

export interface CreateNodeInput {
  workspaceId: string;
  parentId?: string;
  title: string;
  bodyMd: string;
  claims: CreateNodeClaim[];
}

export interface CreateNodeResult {
  node: GraphNode;
  nodeId: string;
  deepLink: string;
  /**
   * The submitted bodyMd with every notional "[^n{i}]" marker bound to its
   * real evidence id(s), and any marker whose claim turned out unsupported
   * stripped entirely -- the same reconciliation lib/agents/orchestrator.ts
   * does for generator-created nodes. Use this, not the bodyMd you sent in:
   * a caller that persists the original submitted bodyMd instead leaves the
   * literal placeholder text in the node (this was a real, shipped bug in
   * two separate callers before create_node started doing this itself).
   */
  bodyMd: string;
  evidence: Array<Omit<Evidence, "id"> & { id: string }>;
  /** True when at least one submitted claim failed re-verification. */
  lowConfidence: boolean;
  droppedRefs: string[];
}

/**
 * §13.2: "`create_node` re-verifies server-side. An MCP client is untrusted
 * input. If the submitted evidence fails the fuzzy match or the numeric
 * floor, drop the anchor and mark the node low-confidence. Never let a client
 * assert `quote_located`."
 *
 * So this takes claims (`refs` + `quote`) and never an asserted tier -- the
 * tier is computed here, from the corpus, by the same deterministic verifier
 * the generators go through. There is deliberately no parameter a caller
 * could use to assert one.
 *
 * Persists the verified node itself (issue #51): this used to return the
 * node for the caller to persist "once fetchWorkspace() isn't fixture-backed
 * anymore" -- that's true now (#47), and both callers (POST /api/nodes,
 * chat's Promote button; the MCP create_node tool) had never actually done
 * that persisting, so a promoted node only ever lived in the client's
 * optimistic zustand state and vanished on refresh. Merges and saves through
 * the same getIngestedWorkspace/setIngestedWorkspace seam updateNodeBody()
 * and runSynthesis() already use, rather than leaving a third caller to
 * reimplement it.
 */
export async function createNode(input: CreateNodeInput): Promise<CreateNodeResult> {
  const ingested = await getIngestedWorkspace(input.workspaceId);
  const base = ingested?.workspace ?? (await fetchWorkspace(input.workspaceId));

  let parent: GraphNode | undefined;
  if (input.parentId) {
    parent = base.nodes.find((n) => n.id === input.parentId);
    if (!parent) {
      throw new UserFacingError(`parent node ${input.parentId} does not exist in workspace ${input.workspaceId}`);
    }
  }

  const nodeId = `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const { bodyMd, evidence } = verifyAndBindClaims({
    nodeId,
    bodyMd: input.bodyMd,
    claims: input.claims,
    chunks: base.chunks,
    numerics: base.numerics,
    idPrefix: `${nodeId}-e`,
  });

  const droppedRefs = evidence.filter((e) => e.tier === "unsupported").map((e) => e.refId);

  const node: GraphNode = {
    id: nodeId,
    workspaceId: input.workspaceId,
    type: "leaf",
    title: input.title,
    bodyMd,
    pillarIndex: parent?.pillarIndex ?? null,
    x: 0,
    y: 0,
    paperId: parent?.paperId ?? base.papers[0]?.id ?? null,
    stale: false,
  };

  const merged: Workspace = {
    ...base,
    nodes: [...base.nodes, node],
    evidence: [...base.evidence, ...evidence],
  };
  await setIngestedWorkspace(merged, ingested?.version);

  return {
    node,
    nodeId,
    deepLink: nodeDeepLink(input.workspaceId, nodeId),
    bodyMd,
    evidence,
    lowConfidence: droppedRefs.length > 0,
    droppedRefs,
  };
}

// --- find_contradictions --------------------------------------------------

/**
 * `quote` is non-nullable here, unlike elsewhere in this file: a pair only
 * qualifies if *both* sides have a kept anchor (see the two-sided filter
 * below), so by construction there is a real quote on each side. Typing it
 * `string | null` would force every consumer to handle a case this function
 * cannot produce.
 */
export interface ContradictionSide {
  nodeId: string;
  title: string;
  quote: string;
  page: number | null;
  deepLink: string;
}

export interface ContradictionPair {
  edgeId: string;
  left: ContradictionSide;
  right: ContradictionSide;
}

/**
 * §13.2 requires pairs with **two-sided** evidence and both quotes. A
 * `contradicts` edge where only one side has a kept anchor is not a
 * contradiction we can show a reader -- it is one claim and an assertion --
 * so it is filtered out here rather than surfaced half-empty. §4.6 says such
 * an edge should be rejected at write time; this is the read-side guard for
 * data that predates that check.
 */
export async function findContradictions(
  workspaceId: string,
  concept?: string,
): Promise<ContradictionPair[]> {
  const workspace = await fetchWorkspace(workspaceId);
  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n] as const));
  const chunkById = new Map(workspace.chunks.map((c) => [c.id, c] as const));

  function sideFor(nodeId: string): ContradictionSide | null {
    const node = nodeById.get(nodeId);
    if (!node) return null;
    const anchored = workspace.evidence.find((e) => e.nodeId === nodeId && e.anchor);
    if (!anchored?.anchor) return null;
    const chunk = chunkById.get(anchored.anchor.chunkId);
    return {
      nodeId,
      title: node.title,
      quote: anchored.anchor.quote,
      page: chunk?.page ?? null,
      deepLink: nodeDeepLink(workspaceId, nodeId),
    };
  }

  const needle = concept?.trim().toLowerCase();

  return workspace.edges
    .filter((e) => e.kind === "contradicts")
    .map((edge) => {
      const left = sideFor(edge.sourceId);
      const right = sideFor(edge.targetId);
      if (!left || !right) return null;
      if (needle) {
        const haystack = `${left.title} ${right.title} ${left.quote ?? ""} ${right.quote ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return null;
      }
      return { edgeId: edge.id, left, right };
    })
    .filter((pair): pair is ContradictionPair => pair !== null);
}

// --- update_node_body -------------------------------------------------

/**
 * Persists an edited node body (`components/inspector/NodeEditor.tsx`'s Save
 * button). Used to be a stub that only ever called `console.log` and closed
 * the editor -- a user's edit vanished on Save with no indication it hadn't
 * gone anywhere (impeccable critique, 2026-08-16, P0). Now a real write
 * through the same seam ingest.ts/synthesis.ts already use:
 * setIngestedWorkspace's node upsert is an UPDATE on a re-used id (see
 * lib/db/queries's onConflictDoUpdate for `nodes`), not a fresh insert.
 *
 * Issue #77 (P0): that write left every existing Evidence row's tier
 * untouched no matter what the new text said -- a "quote located" badge
 * survived a rewrite that no longer matched its source, in exactly the one
 * place a human can freely rewrite a claim. Now re-runs the same
 * deterministic fuzzy-match + entailment-floor check
 * (lib/services/verify.ts's reverifyNodeEvidence()) against the edited body
 * for every evidence row already anchored to this node, downgrading/
 * dropping (and stripping the now-unsupported [^eN] marker) exactly like a
 * freshly-generated claim would be. Also writes a node_versions row with the
 * *pre-edit* body first, so an edit is now auditable -- types/anchor.ts's
 * frozen Workspace contract doesn't need widening for this, since version
 * history isn't part of what the canvas/reader render; it's a side write
 * through lib/db/queries, same as share_tokens or mcp_tokens.
 */
export async function updateNodeBody(input: {
  workspaceId: string;
  nodeId: string;
  bodyMd: string;
}): Promise<{ node: GraphNode; evidence: Evidence[] }> {
  const ingested = await getIngestedWorkspace(input.workspaceId);
  const base = ingested?.workspace ?? (await fetchWorkspace(input.workspaceId));
  const target = base.nodes.find((n) => n.id === input.nodeId);
  if (!target) {
    throw new UserFacingError(`node ${input.nodeId} does not exist in workspace ${input.workspaceId}`);
  }

  const nodeEvidence = base.evidence.filter((e) => e.nodeId === input.nodeId);
  const { bodyMd, evidence: reverifiedEvidence } = reverifyNodeEvidence({
    bodyMd: input.bodyMd,
    evidence: nodeEvidence,
    chunks: base.chunks,
    numerics: base.numerics,
  });

  const updated: GraphNode = { ...target, bodyMd };
  const evidenceById = new Map(reverifiedEvidence.map((e) => [e.id, e]));
  const merged: Workspace = {
    ...base,
    nodes: base.nodes.map((n) => (n.id === input.nodeId ? updated : n)),
    evidence: base.evidence.map((e) => evidenceById.get(e.id) ?? e),
  };
  // setIngestedWorkspace() first: node_versions.node_id has a real FK to
  // nodes.id, and for any node that only ever lived in the static fixture
  // (never yet upserted into a real nodes row -- true of every fixture node
  // until something first writes to this workspace), recording a version
  // before that upsert has run has no row to reference yet. target.bodyMd
  // was captured above, before this overwrite, so recording it after is
  // still the pre-edit body, not the one just written.
  await setIngestedWorkspace(merged, ingested?.version);
  await recordNodeVersion(input.nodeId, target.bodyMd);
  return { node: updated, evidence: reverifiedEvidence };
}

// --- delete_node ------------------------------------------------------------

export interface DeleteNodeResult {
  /** Every other node that had an edge pointing at the deleted one, marked
   *  `stale` rather than deleted or left with a dangling reference. */
  staleNodeIds: string[];
}

/**
 * plan.md §4's only stated cascade invariant is paper-scoped: "Deleting a
 * paper cascades its nodes/chunks but marks cross-paper synthesis nodes
 * `stale` rather than deleting them." There's no equivalent spec for a
 * single node, so this generalizes that one level down -- but only for edge
 * kinds where the *content* of one node actually depends on the other.
 * `contains` is purely structural (a pillar containing a leaf isn't a claim
 * about that leaf's content), so a pillar losing a leaf is not "stale," just
 * smaller -- marking it stale would be a false positive on every ordinary
 * delete. relates/derived_from/agrees/contradicts/extends/shares_method/cites
 * all mean one node's own claim draws on the other's, so losing that other
 * node genuinely does make the referencing node's content incomplete.
 *
 * Edges where the deleted node is the *source* cascade away with it
 * regardless of kind (they represent its own existence), along with its own
 * evidence rows. Edges where it's the *target* are removed either way (a
 * dangling edge.targetId is never valid), and for the content-dependent
 * kinds the other node is marked `stale: true` instead of silently left
 * referencing nothing -- the same "stale, not deleted" signal the
 * paper-delete invariant already uses.
 */
const CONTENT_DEPENDENT_EDGE_KINDS: ReadonlySet<GraphEdge["kind"]> = new Set([
  "relates",
  "derived_from",
  "agrees",
  "contradicts",
  "extends",
  "shares_method",
  "cites",
]);

export async function deleteNode(input: { workspaceId: string; nodeId: string }): Promise<DeleteNodeResult> {
  const ingested = await getIngestedWorkspace(input.workspaceId);
  const base = ingested?.workspace ?? (await fetchWorkspace(input.workspaceId));
  if (!base.nodes.some((n) => n.id === input.nodeId)) {
    throw new UserFacingError(`node ${input.nodeId} does not exist in workspace ${input.workspaceId}`);
  }

  const dependentNodeIds = [
    ...new Set(
      base.edges
        .filter((e) => e.targetId === input.nodeId && CONTENT_DEPENDENT_EDGE_KINDS.has(e.kind))
        .map((e) => e.sourceId),
    ),
  ];

  // A workspace that's never been ingested before (still pure fixture) has no
  // real row for deleteIngestedNode() to act on yet -- this upserts the whole
  // base once so the delete below always has something real to remove. Only
  // runs on that genuine first-ever write; an already-ingested workspace
  // (the common case) skips straight to the delete below.
  //
  // Issue #161: this used to *always* resave the unmodified base first with
  // a version check (issue #103's pattern, meant for saveWorkspace's
  // full-snapshot upsert) and then delete as a second step -- two unrelated
  // concurrent deletes on an already-ingested workspace could spuriously
  // conflict on that shared version counter even though neither touched
  // what the other did. deleteIngestedNode's delete is a precise, targeted
  // mutation (mark *these* ids stale, remove *this* one), not vulnerable to
  // the lost-update problem a version check defends against, so it no
  // longer takes or checks one at all -- see deleteNodeCascade's own doc
  // comment.
  if (!ingested) {
    await setIngestedWorkspace(base);
  }
  await deleteIngestedNode(input.workspaceId, input.nodeId, dependentNodeIds);

  return { staleNodeIds: dependentNodeIds };
}

// --- expand_node (followup chips) ------------------------------------------

export interface ExpandNodeInput {
  workspaceId: string;
  /** The node the reader clicked a followup chip on. Must belong to a paper. */
  nodeId: string;
  /** The followup question itself (one of node.followups), verbatim. */
  question: string;
}

export interface ExpandNodeResult {
  node: GraphNode;
  /** `derived_from`, new node -> the node the followup was asked from. */
  edge: GraphEdge;
  evidence: Array<Omit<Evidence, "id"> & { id: string }>;
  deepLink: string;
  lowConfidence: boolean;
}

/**
 * Answers one followup question (docs/PLAN-V1.md §9.3: "Followup chips call
 * POST /nodes/[id]/expand") by running the same `custom` generator the
 * pillar planner's anti-template leaf uses, scoped to the parent node's own
 * paper with the question as its customPrompt, then re-verifying and binding
 * the result exactly like create_node does -- this is the same "verify
 * before persisting" contract as every other node-creating path, just with
 * an LLM call in front of it instead of a caller-supplied bodyMd.
 *
 * Issue #160: this used to read via bare fetchWorkspace() and never
 * persisted the result at all -- the same P0 bug issue #51 fixed for
 * createNode/promoteToThread (a node only living in the client's
 * optimistic zustand state, gone on refresh), left unfixed here. Now reads
 * via the same getIngestedWorkspace/base pattern and persists through
 * setIngestedWorkspace with the same optimistic-concurrency version check
 * (issue #103) createNode/promoteToThread/updateNodeBody all use.
 */
export async function expandNode(input: ExpandNodeInput): Promise<ExpandNodeResult> {
  const ingested = await getIngestedWorkspace(input.workspaceId);
  const base = ingested?.workspace ?? (await fetchWorkspace(input.workspaceId));

  const parent = base.nodes.find((n) => n.id === input.nodeId);
  if (!parent) throw new UserFacingError(`node ${input.nodeId} does not exist in workspace ${input.workspaceId}`);
  if (!parent.paperId) throw new UserFacingError(`node ${input.nodeId} has no associated paper to expand from`);

  const paper = base.papers.find((p) => p.id === parent.paperId);
  if (!paper) throw new UserFacingError(`paper ${parent.paperId} not found in workspace ${input.workspaceId}`);

  const contextBlock = buildContextBlock(parent.paperId, base.chunks, base.numerics);
  const output = await runGenerator(GENERATORS.custom!, {
    paperTitle: paper.title,
    // A best-effort default for a paper whose archetype hasn't been
    // classified: this only steers the generator's framing, it's never
    // persisted, so a generic fallback here doesn't misrepresent anything.
    archetype: paper.archetype ?? "method_paper",
    contextBlock,
    customPrompt: input.question,
  });

  const nodeId = `expand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { bodyMd, evidence } = verifyAndBindClaims({
    nodeId,
    bodyMd: output.body_md,
    claims: output.evidence,
    chunks: base.chunks,
    numerics: base.numerics,
    idPrefix: `${nodeId}-e`,
  });

  const node: GraphNode = {
    id: nodeId,
    workspaceId: input.workspaceId,
    type: "leaf",
    title: output.title,
    bodyMd,
    pillarIndex: parent.pillarIndex,
    x: 0,
    y: 0,
    paperId: parent.paperId,
    stale: false,
    followups: output.followups,
  };

  const edge: GraphEdge = {
    id: `${nodeId}-derived-from-${parent.id}`,
    workspaceId: input.workspaceId,
    kind: "derived_from",
    sourceId: nodeId,
    targetId: parent.id,
  };

  const merged: Workspace = {
    ...base,
    nodes: [...base.nodes, node],
    edges: [...base.edges, edge],
    evidence: [...base.evidence, ...evidence],
  };
  await setIngestedWorkspace(merged, ingested?.version);

  const droppedRefs = evidence.filter((e) => e.tier === "unsupported");

  return {
    node,
    edge,
    evidence,
    deepLink: nodeDeepLink(input.workspaceId, nodeId),
    lowConfidence: droppedRefs.length > 0,
  };
}

// --- promote_to_thread (chat -> ThreadNode, issue #55) ---------------------

export interface PromoteToThreadInput {
  workspaceId: string;
  title: string;
  /** Body with notional "[^n0]", "[^n1]", ... markers, one per claims[i]. */
  bodyMd: string;
  claims: CreateNodeClaim[];
}

export interface PromoteToThreadResult {
  node: GraphNode;
  /** One `derived_from` to the strongest-overlapping node, `relates` to any
   *  other paper this answer also draws on. Empty if nothing overlapped. */
  edges: GraphEdge[];
  evidence: Array<Omit<Evidence, "id"> & { id: string }>;
  deepLink: string;
  lowConfidence: boolean;
}

/**
 * plan.md §9.4: "Message -> ThreadNode. Pillar classifier picks parent,
 * writes derived_from edge" -- for chat answers that draw on more than one
 * paper, which components/chat/PromoteButton.tsx's existing leaf-node promote
 * (POST /api/nodes) isn't shaped for (one paperId/pillarIndex per node).
 *
 * Rather than a new LLM classifier guessing which pillar/node this text
 * "relates to," this uses the same deterministic spine the rest of the app
 * already trusts: this thread's own claims are re-verified into real
 * Evidence rows exactly like any other node, and *those* refIds are checked
 * against every existing node's evidence for real overlap -- two nodes citing
 * the same source excerpt is a fact, not a guess. refIds are workspace-wide
 * unique (chunk.ordinal is assigned once, never per-paper-reset -- confirmed
 * against the fixture data), so this works correctly across papers with no
 * collision risk. The single best-overlapping node becomes the `derived_from`
 * parent (the fixture's own n-thread-1 has exactly one), and the best
 * candidate from any *other* paper this answer also cites gets a `relates`
 * edge -- one node's evidence can't itself span two papers, but a thread
 * node's citations legitimately can. A thread with no overlap at all (a
 * genuinely new combination of sources) gets no edges, which is a real,
 * valid outcome, not an error.
 */
export async function promoteToThread(input: PromoteToThreadInput): Promise<PromoteToThreadResult> {
  const ingested = await getIngestedWorkspace(input.workspaceId);
  const base = ingested?.workspace ?? (await fetchWorkspace(input.workspaceId));

  const nodeId = `thread-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { bodyMd, evidence } = verifyAndBindClaims({
    nodeId,
    bodyMd: input.bodyMd,
    claims: input.claims,
    chunks: base.chunks,
    numerics: base.numerics,
    idPrefix: `${nodeId}-e`,
  });

  const citedRefIds = new Set(evidence.filter((e) => e.tier !== "unsupported").map((e) => e.refId));

  const overlapScoreByNode = new Map<string, number>();
  for (const ev of base.evidence) {
    if (!citedRefIds.has(ev.refId)) continue;
    overlapScoreByNode.set(ev.nodeId, (overlapScoreByNode.get(ev.nodeId) ?? 0) + 1);
  }

  const nodeById = new Map(base.nodes.map((n) => [n.id, n] as const));
  const bestPerPaper = new Map<string, { nodeId: string; score: number }>();
  for (const [candidateId, score] of overlapScoreByNode) {
    const candidate = nodeById.get(candidateId);
    // Grouped by paperId so at most one candidate per paper survives; a
    // paperless candidate (another thread/synthesis node) groups by its own
    // id instead so it doesn't collide with a real paper's key.
    const groupKey = candidate?.paperId ?? candidateId;
    const current = bestPerPaper.get(groupKey);
    if (!current || score > current.score) {
      bestPerPaper.set(groupKey, { nodeId: candidateId, score });
    }
  }

  const ranked = [...bestPerPaper.values()].sort((a, b) => b.score - a.score);
  const edges: GraphEdge[] = ranked.map((match, i) => ({
    id: `${nodeId}-${i === 0 ? "derived-from" : "relates"}-${match.nodeId}`,
    workspaceId: input.workspaceId,
    kind: i === 0 ? "derived_from" : "relates",
    sourceId: nodeId,
    targetId: match.nodeId,
  }));

  const node: GraphNode = {
    id: nodeId,
    workspaceId: input.workspaceId,
    type: "thread",
    title: input.title,
    bodyMd,
    pillarIndex: null,
    x: 0,
    y: 0,
    paperId: null,
    stale: false,
  };

  const merged: Workspace = {
    ...base,
    nodes: [...base.nodes, node],
    edges: [...base.edges, ...edges],
    evidence: [...base.evidence, ...evidence],
  };
  await setIngestedWorkspace(merged, ingested?.version);

  const droppedRefs = evidence.filter((e) => e.tier === "unsupported");

  return {
    node,
    edges,
    evidence,
    deepLink: nodeDeepLink(input.workspaceId, nodeId),
    lowConfidence: droppedRefs.length > 0,
  };
}
