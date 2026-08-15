import "server-only";
import type { GraphNode, Workspace } from "@/types/anchor";
import { fetchWorkspace } from "./workspace";
import { reconcileBodyWithVerifiedEvidence } from "./verify";

/**
 * Workspace export (docs/PLAN-V1.md §12 addon 9): "Workspace -> Markdown
 * with footnote citations, or BibTeX plus a verbatim quote appendix. Cheap,
 * and it is what converts a demo into something someone uses next week."
 *
 * No LLM call, no re-verification needed here: every evidence row was
 * already verified at write time (generator, chat promote, or synthesis),
 * so export is a pure serialization of what's already in the workspace.
 */

export type ExportFormat = "md" | "bibtex";

/**
 * A stored node's bodyMd can predate its evidence being re-verified (the
 * fixture's own planted misattribution is exactly this case: an
 * `unsupported` evidence row whose [^eN] marker was never stripped from the
 * body). An export is a finished document, not a live re-render, so this is
 * where that reconciliation has to happen -- a dangling footnote reference
 * in an exported file has nothing to resolve to.
 */
function reconciledBody(workspace: Workspace, node: GraphNode): string {
  const nodeEvidence = workspace.evidence
    .filter((e) => e.nodeId === node.id)
    .map((e) => ({ evidenceId: e.id, tier: e.tier }));
  return reconcileBodyWithVerifiedEvidence(node.bodyMd, nodeEvidence);
}

function containedChildren(workspace: Workspace, parentId: string): GraphNode[] {
  const nodeById = new Map(workspace.nodes.map((n) => [n.id, n] as const));
  return workspace.edges
    .filter((e) => e.kind === "contains" && e.sourceId === parentId)
    .map((e) => nodeById.get(e.targetId))
    .filter((n): n is GraphNode => Boolean(n));
}

/** Real GFM footnote syntax: `[^eN]` in body text pairs with a `[^eN]: ...` definition. */
export async function exportWorkspaceMarkdown(workspaceId: string): Promise<string> {
  const workspace = await fetchWorkspace(workspaceId);
  const chunkById = new Map(workspace.chunks.map((c) => [c.id, c] as const));
  const lines: string[] = [`# ${workspace.name}`, ""];

  for (const paperNode of workspace.nodes.filter((n) => n.type === "paper")) {
    const paper = workspace.papers.find((p) => p.id === paperNode.paperId);
    lines.push(`## ${paperNode.title}`);
    if (paper) {
      const byline = [paper.authors.join(", "), paper.year ? String(paper.year) : null].filter(Boolean).join(", ");
      if (byline) lines.push(`*${byline}*`);
      if (paper.sourceUrl) lines.push(`<${paper.sourceUrl}>`);
    }
    lines.push("");

    for (const pillar of containedChildren(workspace, paperNode.id).filter((n) => n.type === "pillar")) {
      lines.push(`### ${pillar.title}`, "");
      for (const leaf of containedChildren(workspace, pillar.id).filter((n) => n.type === "leaf")) {
        lines.push(`#### ${leaf.title}`, "", reconciledBody(workspace, leaf), "");
      }
    }
  }

  const synthesisNodes = workspace.nodes.filter((n) => n.type === "synthesis");
  if (synthesisNodes.length > 0) {
    lines.push("## Cross-paper synthesis", "");
    for (const node of synthesisNodes) {
      lines.push(`### ${node.title}`, "", reconciledBody(workspace, node), "");
    }
  }

  const footnotes = workspace.evidence
    .filter((e) => e.anchor)
    .map((e) => {
      const chunk = chunkById.get(e.anchor!.chunkId);
      const page = chunk ? `, p.${chunk.page}` : "";
      return `[^${e.id}]: "${e.anchor!.quote}" (${e.refId}${page} -- ${e.tier})`;
    });

  if (footnotes.length > 0) lines.push("---", "", ...footnotes);

  return lines.join("\n");
}

/**
 * BibTeX has no native field for prose, so the verbatim quote appendix is a
 * `%`-prefixed comment block under each entry -- every BibTeX parser treats
 * `%` as a full-line comment, so the appendix is inert to citation tooling
 * but still readable by a human opening the file.
 */
export async function exportWorkspaceBibtex(workspaceId: string): Promise<string> {
  const workspace = await fetchWorkspace(workspaceId);
  const blocks: string[] = [];

  for (const paper of workspace.papers) {
    const key = paper.id.replace(/[^a-zA-Z0-9]/g, "") || "paper";
    const authorField = paper.authors.length > 0 ? paper.authors.join(" and ") : "Unknown";
    const fields = [
      `  title = {${paper.title}}`,
      `  author = {${authorField}}`,
      paper.year ? `  year = {${paper.year}}` : null,
      paper.sourceUrl ? `  url = {${paper.sourceUrl}}` : null,
    ].filter((f): f is string => f !== null);

    blocks.push([`@article{${key},`, fields.join(",\n") + ",", `}`].join("\n"));

    const quotes = workspace.evidence.filter((e) => {
      if (!e.anchor) return false;
      return chunkBelongsToPaper(workspace, e.anchor.chunkId, paper.id);
    });
    if (quotes.length > 0) {
      blocks.push(
        [`% Verbatim quotes for ${key}:`, ...quotes.map((e) => `%   [${e.refId}] "${e.anchor!.quote}"`)].join("\n"),
      );
    }
  }

  return blocks.join("\n\n");
}

function chunkBelongsToPaper(workspace: Workspace, chunkId: string, paperId: string): boolean {
  return workspace.chunks.find((c) => c.id === chunkId)?.paperId === paperId;
}
