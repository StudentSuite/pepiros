import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import { deriveSuggestedQuestions } from "./suggestions";

function paper(id: string, title: string): Workspace["papers"][number] {
  return { id, workspaceId: "ws-1", title, authors: [], year: null, archetype: null, sourceUrl: null, pdfStoragePath: null };
}

function pillar(id: string, paperId: string, title: string): Workspace["nodes"][number] {
  return { id, workspaceId: "ws-1", type: "pillar", title, bodyMd: "", pillarIndex: 0, x: 0, y: 0, paperId, stale: false };
}

const baseWorkspace: Workspace = {
  id: "ws-1",
  name: "Test",
  papers: [],
  chunks: [],
  numerics: [],
  nodes: [],
  edges: [],
  evidence: [],
};

describe("deriveSuggestedQuestions", () => {
  it("returns nothing for an empty workspace", () => {
    expect(deriveSuggestedQuestions(baseWorkspace)).toEqual([]);
    expect(deriveSuggestedQuestions(null)).toEqual([]);
  });

  it("derives paper- and pillar-specific questions instead of a hardcoded set", () => {
    const workspace: Workspace = {
      ...baseWorkspace,
      papers: [paper("p1", "Bright Light and Sleep Onset"), paper("p2", "Circadian Disruption Meta-Analysis")],
      nodes: [
        pillar("n1", "p1", "Methods"),
        pillar("n2", "p1", "Key Finding"),
        pillar("n3", "p2", "Methods"),
      ],
    };

    const questions = deriveSuggestedQuestions(workspace);

    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(4);
    // Prefers "Key Finding" over "Methods" when both exist for the same paper.
    expect(questions[0]).toContain("key finding");
    expect(questions.some((q) => q.includes("Bright Light and Sleep Onset"))).toBe(true);
    expect(questions.some((q) => q.includes("disagree"))).toBe(true);
  });

  it("surfaces a contradiction question only when a contradicts edge exists", () => {
    const withContradiction: Workspace = {
      ...baseWorkspace,
      papers: [paper("p1", "Paper One")],
      edges: [{ id: "e1", workspaceId: "ws-1", kind: "contradicts", sourceId: "a", targetId: "b" }],
    };
    expect(deriveSuggestedQuestions(withContradiction).some((q) => q.includes("contradict"))).toBe(true);

    const without: Workspace = { ...baseWorkspace, papers: [paper("p1", "Paper One")] };
    expect(deriveSuggestedQuestions(without).some((q) => q.includes("not establish"))).toBe(true);
  });

  it("truncates long titles", () => {
    const longTitle = "A".repeat(100);
    const workspace: Workspace = { ...baseWorkspace, papers: [paper("p1", longTitle)] };
    const questions = deriveSuggestedQuestions(workspace);
    expect(questions.every((q) => q.length < 120)).toBe(true);
  });
});
