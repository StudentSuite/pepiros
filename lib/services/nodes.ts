import "server-only";
import type { Evidence, GraphEdge, GraphNode, Workspace } from "@/types/anchor";
import { verifyAndBindClaims } from "./verify";
import { fetchWorkspace } from "./workspace";
import { getIngestedWorkspace, setIngestedWorkspace } from "./ingestStore";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import { GENERATORS, runGenerator } from "@/lib/agents/generators";

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

export async function getNode(workspaceId: string, nodeId: string): Promise<ResolvedNode | null> {
  const workspace = await fetchWorkspace(workspaceId);
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
        deepLink: nodeDeepLink(workspaceId, nodeId),
      };
    });

  return {
    nodeId: node.id,
    type: node.type,
    title: node.title,
    bodyMd: node.bodyMd,
    paperId: node.paperId,
    stale: node.stale,
    deepLink: nodeDeepLink(workspaceId, node.id),
    evidence,
  };
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
  const base = (await getIngestedWorkspace(input.workspaceId)) ?? (await fetchWorkspace(input.workspaceId));

  let parent: GraphNode | undefined;
  if (input.parentId) {
    parent = base.nodes.find((n) => n.id === input.parentId);
    if (!parent) {
      throw new Error(`parent node ${input.parentId} does not exist in workspace ${input.workspaceId}`);
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
  await setIngestedWorkspace(merged);

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
 * Does not re-run claim verification against the edited text and does not
 * write a node_versions history row -- both real, both out of scope for this
 * fix (types/anchor.ts's Workspace contract has no node-version concept to
 * extend without widening that frozen contract, a separate decision).
 */
export async function updateNodeBody(input: {
  workspaceId: string;
  nodeId: string;
  bodyMd: string;
}): Promise<GraphNode> {
  const base = (await getIngestedWorkspace(input.workspaceId)) ?? (await fetchWorkspace(input.workspaceId));
  const target = base.nodes.find((n) => n.id === input.nodeId);
  if (!target) {
    throw new Error(`node ${input.nodeId} does not exist in workspace ${input.workspaceId}`);
  }

  const updated: GraphNode = { ...target, bodyMd: input.bodyMd };
  const merged: Workspace = {
    ...base,
    nodes: base.nodes.map((n) => (n.id === input.nodeId ? updated : n)),
  };
  await setIngestedWorkspace(merged);
  return updated;
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
 */
export async function expandNode(input: ExpandNodeInput): Promise<ExpandNodeResult> {
  const workspace = await fetchWorkspace(input.workspaceId);

  const parent = workspace.nodes.find((n) => n.id === input.nodeId);
  if (!parent) throw new Error(`node ${input.nodeId} does not exist in workspace ${input.workspaceId}`);
  if (!parent.paperId) throw new Error(`node ${input.nodeId} has no associated paper to expand from`);

  const paper = workspace.papers.find((p) => p.id === parent.paperId);
  if (!paper) throw new Error(`paper ${parent.paperId} not found in workspace ${input.workspaceId}`);

  const contextBlock = buildContextBlock(parent.paperId, workspace.chunks, workspace.numerics);
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
    chunks: workspace.chunks,
    numerics: workspace.numerics,
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

  const droppedRefs = evidence.filter((e) => e.tier === "unsupported");

  return {
    node,
    edge,
    evidence,
    deepLink: nodeDeepLink(input.workspaceId, nodeId),
    lowConfidence: droppedRefs.length > 0,
  };
}
