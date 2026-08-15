import type { Workspace } from "@/types/anchor";

/**
 * Chat's four starter questions (docs/PLAN-V1.md §14.5: "derived from the
 * paper's real concepts," never generic), derived from whatever workspace is
 * actually loaded rather than hardcoded to the two fixture papers. Pure and
 * deterministic -- no model call needed, the same reason
 * lib/graph/visibility.ts stays out of the model layer.
 */

const MAX_QUESTIONS = 4;
const MAX_TITLE_LENGTH = 60;

function shortTitle(title: string): string {
  return title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH - 3)}...` : title;
}

/** "Key Finding" reads better in a question than "Methods" -- prefer it when both exist. */
function bestPillarTitle(titles: string[]): string | null {
  if (titles.length === 0) return null;
  return titles.find((t) => t.toLowerCase() !== "methods") ?? titles[0]!;
}

export function deriveSuggestedQuestions(workspace: Workspace | null | undefined): string[] {
  if (!workspace || workspace.papers.length === 0) return [];

  const pillarTitlesByPaper = new Map<string, string[]>();
  for (const node of workspace.nodes) {
    if (node.type !== "pillar" || !node.paperId) continue;
    const list = pillarTitlesByPaper.get(node.paperId) ?? [];
    list.push(node.title);
    pillarTitlesByPaper.set(node.paperId, list);
  }

  const questions: string[] = [];

  for (const paper of workspace.papers) {
    const pillar = bestPillarTitle(pillarTitlesByPaper.get(paper.id) ?? []);
    if (pillar) questions.push(`What does ${shortTitle(paper.title)} find about ${pillar.toLowerCase()}?`);
    if (questions.length >= 2) break;
  }

  const [first, second] = workspace.papers;
  if (first && second) {
    questions.push(`Where do ${shortTitle(first.title)} and ${shortTitle(second.title)} disagree?`);
  }

  if (workspace.edges.some((e) => e.kind === "contradicts")) {
    questions.push("What do the papers in this workspace contradict each other on?");
  } else if (first) {
    questions.push(`What does ${shortTitle(first.title)} not establish?`);
  }

  return [...new Set(questions)].slice(0, MAX_QUESTIONS);
}
