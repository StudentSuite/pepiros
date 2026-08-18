import "server-only";
import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import { z } from "zod";
import { strongModel } from "@/lib/ai/client";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import type { EdgeKind, Evidence, GraphEdge, GraphNode, PaperArchetype, Workspace } from "@/types/anchor";
import { fetchWorkspace } from "./workspace";
import { getIngestedWorkspace, setIngestedWorkspace } from "./ingestStore";
import { createNode } from "./nodes";

const ARCHETYPE_LABELS: Record<PaperArchetype, string> = {
  rct: "RCT",
  cohort_study: "Cohort study",
  systematic_review: "Systematic review",
  method_paper: "Method paper",
  ml_model: "ML model",
  case_report: "Case report",
  bioinformatics_pipeline: "Bioinformatics pipeline",
  preprint_theory: "Preprint theory",
  dataset_paper: "Dataset paper",
};

/**
 * Cross-paper synthesis (docs/PLAN-V1.md §10): a pairwise comparison pass
 * over every pair of papers in a workspace, writing real
 * agrees/contradicts/extends/shares_method/relates edges instead of
 * `find_contradictions` only ever reading edges that were already there.
 *
 * Scope note (issue #95): the pairwise comparison pass backs Consensus and
 * Contradictions directly (an LLM classification per pair, two-sided-
 * evidence verified). Timeline of Findings and Methodological Divergence
 * are added below, deterministically, from real per-paper metadata now
 * that it exists (paper.year, paper.archetype -- issue #82 and this same
 * issue's ingest.ts fix respectively; both were null for every real-
 * ingested paper before that, which is exactly why these two stayed
 * unshipped: a "timeline" or "divergence" section built from all-null
 * fields would have been empty or fake for every real workspace, only
 * ever looking populated against the fixture's hand-authored values).
 * Dataset Overlap and Open Questions are still deferred: they need
 * signals nothing in this pipeline extracts at all (dataset identifiers,
 * a genuine gap-in-the-literature judgment) -- not a metadata-persistence
 * gap like the other two, but new extraction work.
 *
 * The two-sided evidence invariant (§4.6: "a contradicts edge with one-sided
 * evidence is rejected at write time") is enforced by routing each side's
 * claim through the exact same createNode() the MCP tool and chat's Promote
 * button use: if either side's claim doesn't verify, the whole pair is
 * skipped, not written with only one real quote behind it.
 */

const RELATION_KINDS = ["agrees", "contradicts", "extends", "shares_method", "relates"] as const;

const PairRelationSchema = z.object({
  relation: z.enum([...RELATION_KINDS, "none"]),
  summaryA: z.string().describe("One sentence, paper A's position, in your own words"),
  refA: z.string().describe("Stable citation id from Paper A's excerpts backing summaryA, e.g. C7"),
  quoteA: z.string().describe("Verbatim quote from Paper A's excerpts"),
  summaryB: z.string().describe("One sentence, paper B's position, in your own words"),
  refB: z.string().describe("Stable citation id from Paper B's excerpts backing summaryB, e.g. C12"),
  quoteB: z.string().describe("Verbatim quote from Paper B's excerpts"),
});

const SYSTEM_PROMPT = `You compare two research papers' excerpts and classify their relationship.

relation is one of:
- agrees: both papers reach the same conclusion on the same question
- contradicts: the papers reach opposing conclusions on the same question
- extends: paper B builds on or generalizes a finding from paper A (or vice versa)
- shares_method: both use the same or closely related methodology
- relates: same topic, but no direct agreement, contradiction, extension, or shared method
- none: the two papers do not meaningfully relate

Cite the bare id in square brackets exactly as shown, e.g. "C7" -- never invent one, never include the header.
Quote or closely paraphrase the excerpt you cite for each side; a downstream deterministic verifier re-checks
both quotes against the real source text and drops the pair if either one does not match.`;

export interface SynthesisRejection {
  paperAId: string;
  paperBId: string;
  reason: string;
}

export interface SynthesisResult {
  pairsCompared: number;
  edgesWritten: GraphEdge[];
  synthesisNodesWritten: GraphNode[];
  rejected: SynthesisRejection[];
}

function synthesisNodeId(workspaceId: string, kind: string): string {
  return `synth-${kind}-${workspaceId}`;
}

export async function runSynthesis(workspaceId: string): Promise<SynthesisResult> {
  const workspace = (await getIngestedWorkspace(workspaceId)) ?? (await fetchWorkspace(workspaceId));
  const papers = workspace.papers;

  const newLeafNodes: GraphNode[] = [];
  const newContainsEdges: GraphEdge[] = [];
  const relationEdges: GraphEdge[] = [];
  const newEvidence: Evidence[] = [];
  const rejected: SynthesisRejection[] = [];
  const contradictionSummaries: string[] = [];
  const agreementSummaries: string[] = [];
  let pairsCompared = 0;

  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const paperA = papers[i]!;
      const paperB = papers[j]!;
      pairsCompared++;

      const blockA = buildContextBlock(paperA.id, workspace.chunks, workspace.numerics);
      const blockB = buildContextBlock(paperB.id, workspace.chunks, workspace.numerics);
      if (!blockA || !blockB) {
        rejected.push({ paperAId: paperA.id, paperBId: paperB.id, reason: "one side has no extracted text yet" });
        continue;
      }

      const { object } = await generateObject({
        model: strongModel(),
        schema: PairRelationSchema,
        system: SYSTEM_PROMPT,
        prompt: `Paper A: ${paperA.title}\n${blockA}\n\nPaper B: ${paperB.title}\n${blockB}`,
      });

      if (object.relation === "none") {
        rejected.push({ paperAId: paperA.id, paperBId: paperB.id, reason: "model found no meaningful relation" });
        continue;
      }

      const pairId = randomUUID().slice(0, 8);
      const [sideA, sideB] = await Promise.all([
        createNode({
          workspaceId,
          title: `${paperA.title}: ${object.relation} position`,
          bodyMd: `${object.summaryA} [^n0]`,
          claims: [{ refs: [object.refA], quote: object.quoteA }],
        }),
        createNode({
          workspaceId,
          title: `${paperB.title}: ${object.relation} position`,
          bodyMd: `${object.summaryB} [^n0]`,
          claims: [{ refs: [object.refB], quote: object.quoteB }],
        }),
      ]);

      // Two-sided evidence invariant: a relation is only as real as its
      // weaker side. One dropped anchor means the pair doesn't get written.
      if (sideA.lowConfidence || sideB.lowConfidence) {
        rejected.push({
          paperAId: paperA.id,
          paperBId: paperB.id,
          reason: `claimed ${object.relation} but at least one side's quote did not verify against its source`,
        });
        continue;
      }

      // sideA/sideB.bodyMd already has the real evidence marker bound in --
      // createNode() (lib/services/nodes.ts) does that reconciliation itself
      // now, the same way lib/agents/orchestrator.ts does for generator-
      // created nodes. It didn't always: reusing that return value here,
      // instead of re-deriving the marker from sideA.evidence[0] by hand, is
      // what keeps this from drifting out of sync with createNode() again.
      const nodeA: GraphNode = {
        id: sideA.nodeId,
        workspaceId,
        type: "leaf",
        title: `${paperA.title}: ${object.relation} position`,
        bodyMd: sideA.bodyMd,
        pillarIndex: null,
        x: 0,
        y: 0,
        paperId: paperA.id,
        stale: false,
      };
      const nodeB: GraphNode = {
        id: sideB.nodeId,
        workspaceId,
        type: "leaf",
        title: `${paperB.title}: ${object.relation} position`,
        bodyMd: sideB.bodyMd,
        pillarIndex: null,
        x: 0,
        y: 0,
        paperId: paperB.id,
        stale: false,
      };
      newLeafNodes.push(nodeA, nodeB);
      newEvidence.push(...sideA.evidence, ...sideB.evidence);

      const paperNodeA = workspace.nodes.find((n) => n.type === "paper" && n.paperId === paperA.id);
      const paperNodeB = workspace.nodes.find((n) => n.type === "paper" && n.paperId === paperB.id);
      if (paperNodeA) {
        newContainsEdges.push({ id: `synth-c-${pairId}-a`, workspaceId, kind: "contains", sourceId: paperNodeA.id, targetId: nodeA.id });
      }
      if (paperNodeB) {
        newContainsEdges.push({ id: `synth-c-${pairId}-b`, workspaceId, kind: "contains", sourceId: paperNodeB.id, targetId: nodeB.id });
      }

      relationEdges.push({
        id: `synth-r-${pairId}`,
        workspaceId,
        kind: object.relation as EdgeKind,
        sourceId: nodeA.id,
        targetId: nodeB.id,
      });

      if (object.relation === "contradicts") {
        contradictionSummaries.push(`- **${paperA.title}** vs **${paperB.title}**: "${object.summaryA}" vs "${object.summaryB}"`);
      } else if (object.relation === "agrees") {
        agreementSummaries.push(`- **${paperA.title}** and **${paperB.title}**: ${object.summaryA}`);
      }
    }
  }

  const synthesisNodesWritten: GraphNode[] = [];
  if (contradictionSummaries.length > 0) {
    synthesisNodesWritten.push({
      id: synthesisNodeId(workspaceId, "contradictions"),
      workspaceId,
      type: "synthesis",
      title: "Contradictions",
      bodyMd: contradictionSummaries.join("\n"),
      pillarIndex: null,
      x: 0,
      y: 0,
      paperId: null,
      stale: false,
    });
  }
  if (agreementSummaries.length > 0) {
    synthesisNodesWritten.push({
      id: synthesisNodeId(workspaceId, "consensus"),
      workspaceId,
      type: "synthesis",
      title: "Consensus",
      bodyMd: agreementSummaries.join("\n"),
      pillarIndex: null,
      x: 0,
      y: 0,
      paperId: null,
      stale: false,
    });
  }

  // Timeline of Findings: deterministic, no LLM call -- just papers with a
  // real publication year, chronologically. A single dated paper isn't a
  // timeline, so this only writes with 2+.
  const datedPapers = papers.filter((p): p is typeof p & { year: number } => p.year !== null);
  if (datedPapers.length >= 2) {
    const sorted = [...datedPapers].sort((a, b) => a.year - b.year);
    synthesisNodesWritten.push({
      id: synthesisNodeId(workspaceId, "timeline"),
      workspaceId,
      type: "synthesis",
      title: "Timeline of Findings",
      bodyMd: sorted.map((p) => `- **${p.year}** — ${p.title}`).join("\n"),
      pillarIndex: null,
      x: 0,
      y: 0,
      paperId: null,
      stale: false,
    });
  }

  // Methodological Divergence: deterministic, no LLM call -- groups papers
  // by their already-classified archetype (lib/agents/archetypeClassifier.ts,
  // persisted onto Paper by ingest.ts). Divergence needs at least two
  // distinct archetypes actually present; every paper sharing one archetype
  // isn't a divergence to report.
  const archetypeGroups = new Map<PaperArchetype, string[]>();
  for (const p of papers) {
    if (!p.archetype) continue;
    const group = archetypeGroups.get(p.archetype) ?? [];
    group.push(p.title);
    archetypeGroups.set(p.archetype, group);
  }
  if (archetypeGroups.size >= 2) {
    const lines = [...archetypeGroups.entries()].map(
      ([archetype, titles]) => `- **${ARCHETYPE_LABELS[archetype] ?? archetype}**: ${titles.join(", ")}`,
    );
    synthesisNodesWritten.push({
      id: synthesisNodeId(workspaceId, "methodological-divergence"),
      workspaceId,
      type: "synthesis",
      title: "Methodological Divergence",
      bodyMd: lines.join("\n"),
      pillarIndex: null,
      x: 0,
      y: 0,
      paperId: null,
      stale: false,
    });
  }

  const edgesWritten = [...newContainsEdges, ...relationEdges];
  const merged: Workspace = {
    ...workspace,
    nodes: [
      ...workspace.nodes.filter((n) => !synthesisNodesWritten.some((s) => s.id === n.id)),
      ...newLeafNodes,
      ...synthesisNodesWritten,
    ],
    edges: [...workspace.edges, ...edgesWritten],
    evidence: [...workspace.evidence, ...newEvidence],
  };
  await setIngestedWorkspace(merged);

  return { pairsCompared, edgesWritten, synthesisNodesWritten, rejected };
}
