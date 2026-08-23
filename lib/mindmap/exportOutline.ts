import type { EvidenceTier, GraphNode, Workspace } from "@/types/anchor";
import { resolveInlineRefs } from "@/lib/reader/inlineRefs";

/**
 * Markmap (issue #312) renders whatever markdown it's handed as-is; a claim
 * title with a stray newline or a leading `#`/`-` would be read as new
 * mindmap structure instead of node text.
 */
function escapeMd(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/^[#*>-]+\s*/, "");
}

// Same weakest-first rule LeafNode.tsx uses on the canvas (plan.md §4: don't
// let a claim's strongest citation hide a weaker one sitting beside it).
const TIER_RANK: Record<EvidenceTier, number> = { unsupported: 0, paraphrase: 1, quote_located: 2 };
const TIER_LABEL: Record<EvidenceTier, string> = {
  unsupported: "unsupported",
  paraphrase: "paraphrase",
  quote_located: "quote located",
};

function weakestTier(leaf: GraphNode, evidence: Workspace["evidence"]): EvidenceTier | null {
  const refs = resolveInlineRefs(leaf.bodyMd, evidence);
  return refs.reduce<EvidenceTier | null>(
    (acc, ev) => (acc === null || TIER_RANK[ev.tier] < TIER_RANK[acc] ? ev.tier : acc),
    null,
  );
}

export interface MindmapOutline {
  markdown: string;
  /**
   * The real `pillarIndex` behind each top-level branch, in the same order
   * the branches appear in `markdown`. Markmap's transform preserves
   * markdown list/heading order in the tree it builds, so a rendered node's
   * `state.path.split(".")[1]` (its top-level branch index) looks up
   * `pillarOrder[branchIndex]` to recover which pillar it belongs to --
   * lets the client colour every node in a branch via `pillarColor()`
   * (components/ui/PillarChip.tsx), the same helper GraphCanvas uses, without
   * this module (pure data, no React) importing a component file.
   */
  pillarOrder: (number | null)[];
}

const EMPTY_OUTLINE: MindmapOutline = { markdown: "", pillarOrder: [] };

/**
 * Renders a paper's already-verified pillar/claim graph as a markdown
 * outline for Markmap -- a formatting step over data the grounding spine
 * already produced, never a new AI extraction (context-for-pep.md §8's
 * locked mechanism: this is explicitly why Markmap was chosen over a
 * generator-type mindmap, which the plan's own cut list already killed for
 * being redundant re-extraction).
 *
 * Structure mirrors OutlineClient.tsx's tree (paper -> pillar -> leaf via
 * `contains` edges), scoped to one paper: thread/synthesis nodes are
 * cross-paper by nature and, like the outline page's own "Cross-paper
 * nodes" section, don't belong to any single paper's mindmap.
 */
export function buildMindmapOutline(workspace: Workspace, paperId: string): MindmapOutline {
  const paper = workspace.papers.find((p) => p.id === paperId);
  const paperNode = workspace.nodes.find((n) => n.type === "paper" && n.paperId === paperId);
  if (!paper || !paperNode) return EMPTY_OUTLINE;

  const childrenByParent = new Map<string, GraphNode[]>();
  for (const edge of workspace.edges) {
    if (edge.kind !== "contains") continue;
    const child = workspace.nodes.find((n) => n.id === edge.targetId);
    if (!child || child.paperId !== paperId) continue;
    const list = childrenByParent.get(edge.sourceId) ?? [];
    list.push(child);
    childrenByParent.set(edge.sourceId, list);
  }

  const pillars = (childrenByParent.get(paperNode.id) ?? []).filter((n) => n.type === "pillar");
  if (pillars.length === 0) return EMPTY_OUTLINE;

  const lines: string[] = [`# ${escapeMd(paper.title)}`];
  for (const pillar of pillars) {
    lines.push("", `## ${escapeMd(pillar.title)}`);
    const leaves = (childrenByParent.get(pillar.id) ?? []).filter((n) => n.type === "leaf");
    for (const leaf of leaves) {
      const tier = weakestTier(leaf, workspace.evidence);
      const suffix = tier ? ` (${TIER_LABEL[tier]})` : "";
      lines.push(`- ${escapeMd(leaf.title)}${suffix}`);
    }
  }

  return { markdown: lines.join("\n"), pillarOrder: pillars.map((p) => p.pillarIndex) };
}
