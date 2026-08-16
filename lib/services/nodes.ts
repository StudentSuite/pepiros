import type { Evidence, GraphNode, Workspace } from "@/types/anchor";
import { verifyAndBindClaims } from "./verify";
import { fetchWorkspace } from "./workspace";

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
 * Persistence is out of scope while `fetchWorkspace()` is fixture-backed
 * (CLAUDE.md's current data seam); this returns the verified node for the
 * caller to persist, which is the same contract `runOrchestrator` already
 * uses.
 */
export async function createNode(input: CreateNodeInput): Promise<CreateNodeResult> {
  const workspace = await fetchWorkspace(input.workspaceId);

  if (input.parentId && !workspace.nodes.some((n) => n.id === input.parentId)) {
    throw new Error(`parent node ${input.parentId} does not exist in workspace ${input.workspaceId}`);
  }

  const nodeId = `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const { bodyMd, evidence } = verifyAndBindClaims({
    nodeId,
    bodyMd: input.bodyMd,
    claims: input.claims,
    chunks: workspace.chunks,
    numerics: workspace.numerics,
    idPrefix: `${nodeId}-e`,
  });

  const droppedRefs = evidence.filter((e) => e.tier === "unsupported").map((e) => e.refId);

  return {
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
