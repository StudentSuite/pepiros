import "server-only";
import PQueue from "p-queue";
import type { Chunk, Evidence, GraphNode, Numeric, PaperArchetype } from "@/types/anchor";
import type { PillarPlan } from "@/lib/schemas";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import { classifyArchetype } from "./archetypeClassifier";
import { planPillars } from "./pillarPlanner";
import { GENERATORS, runGenerator, bindEvidenceMarkers, type GeneratorContext } from "./generators";
import { verifyClaimsAgainstCorpus } from "@/lib/services/verify";
import { stripDroppedCitation } from "@/lib/grounding/verify";
import type { ClaimedEvidence } from "@/lib/grounding/verify";

/**
 * Generator fan-out for one paper (docs/PLAN-V1.md §7-8): archetype ->
 * archetype-conditioned pillar plan -> one generator call per planned leaf,
 * concurrency-limited and failure-isolated so one bad generator never breaks
 * the rest of the graph. Returns constructed nodes/evidence in-memory --
 * there's no live Postgres to verify a write path against yet (CLAUDE.md's
 * "current data seam"), so persistence is deliberately the caller's problem,
 * not this file's.
 */

const CONCURRENCY = 4;

export interface OrchestratorInput {
  workspaceId: string;
  paperId: string;
  paperTitle: string;
  /** Whole-workspace chunks/numerics; filtered internally to this paper. */
  chunks: Chunk[];
  numerics: Numeric[];
}

export type LeafStatus = "ok" | "failed" | "unimplemented";

export interface LeafResult {
  pillarKey: string;
  leafKey: string;
  generator: string;
  status: LeafStatus;
  node?: GraphNode;
  evidence?: Evidence[];
  error?: string;
}

export interface OrchestratorResult {
  archetype: PaperArchetype;
  pillarPlan: PillarPlan;
  pillarNodes: GraphNode[];
  leaves: LeafResult[];
}

/**
 * Verifies a generator's claimed evidence against the corpus and binds real
 * evidence ids into body_md. A claim with N refs (an aggregate claim, plan.md
 * §4) becomes N separate Evidence rows -- the existing Evidence type is
 * one-ref-per-row -- concatenated into one marker replacement, so the CI
 * invariant "every [^eN] marker has a matching evidence row" still holds for
 * every individual marker, not just the claim as a whole.
 */
/**
 * A model is instructed (runGenerator.ts's SHARED_SYSTEM_PROMPT) to cite the
 * bare id ("C7"), not the full context-block header ("C7 | Methods | p.4")
 * -- but a prompt is a request, not a guarantee, and this exact slip was
 * observed live while building this. Stripping to the leading token before
 * verification means a model that ignores the instruction still resolves
 * correctly instead of silently registering as a hallucinated_ref.
 */
function normalizeRef(ref: string): string {
  return ref.split("|")[0]!.trim();
}

function verifyGeneratorOutput(
  nodeId: string,
  bodyMd: string,
  claims: Array<{ refs: string[]; quote: string }>,
  chunks: Chunk[],
  numerics: Numeric[],
  idPrefix: string,
): { bodyMd: string; evidence: Evidence[] } {
  const flatClaims: ClaimedEvidence[] = claims.flatMap((claim) =>
    claim.refs.map((refId) => ({ nodeId, refId: normalizeRef(refId), quote: claim.quote })),
  );

  const verified = verifyClaimsAgainstCorpus({ chunks, numerics, claims: flatClaims });

  const evidence: Evidence[] = [];
  const markerReplacements: string[] = [];
  let cursor = 0;

  for (const claim of claims) {
    const group = verified.slice(cursor, cursor + claim.refs.length);
    cursor += claim.refs.length;

    const ids = group.map((result) => {
      const id = `${idPrefix}${evidence.length + 1}`;
      evidence.push({ id, ...result.evidence });
      return id;
    });
    markerReplacements.push(ids.map((id) => `[^${id}]`).join(""));
  }

  const bound = bindEvidenceMarkers(bodyMd, markerReplacements);
  const finalBody = evidence.reduce(
    (body, ev) => (ev.tier === "unsupported" ? stripDroppedCitation(body, ev.id) : body),
    bound,
  );

  return { bodyMd: finalBody, evidence };
}

async function runLeaf(
  ctx: GeneratorContext,
  nodeId: string,
  workspaceId: string,
  paperId: string,
  pillarIndex: number | null,
  chunks: Chunk[],
  numerics: Numeric[],
  pillarKey: string,
  leafKey: string,
  generatorName: string,
): Promise<LeafResult> {
  const config = GENERATORS[generatorName as keyof typeof GENERATORS];
  if (!config) {
    // A plan can legitimately reference one of the 15 not-yet-implemented
    // generators (docs/PLAN-V1.md §8 lists 21; see lib/agents/generators's
    // registry comment) -- this is expected, not a crash, and gives the
    // caller a clean "retry later" leaf rather than a thrown error.
    return { pillarKey, leafKey, generator: generatorName, status: "unimplemented" };
  }

  try {
    const output = await runGenerator(config, ctx);
    const { bodyMd, evidence } = verifyGeneratorOutput(
      nodeId,
      output.body_md,
      output.evidence,
      chunks,
      numerics,
      `${nodeId}-e`,
    );

    const node: GraphNode = {
      id: nodeId,
      workspaceId,
      type: "leaf",
      title: output.title,
      bodyMd,
      pillarIndex,
      x: 0,
      y: 0,
      paperId,
      stale: false,
    };

    return { pillarKey, leafKey, generator: generatorName, status: "ok", node, evidence };
  } catch (error) {
    // Per-node failure isolation (docs/PLAN-V1.md §8): one generator failing
    // (rate limit, schema validation failure after retries, etc.) must never
    // take down the rest of the paper's graph.
    return {
      pillarKey,
      leafKey,
      generator: generatorName,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const paperChunks = input.chunks.filter((c) => c.paperId === input.paperId);
  const paperChunkIds = new Set(paperChunks.map((c) => c.id));
  const paperNumerics = input.numerics.filter((n) => paperChunkIds.has(n.chunkId));
  const contextBlock = buildContextBlock(input.paperId, input.chunks, input.numerics);

  const excerpt = paperChunks
    .slice(0, 2)
    .map((c) => c.text)
    .join("\n\n");
  const archetype = await classifyArchetype({ title: input.paperTitle, excerpt });

  const hasFigures = paperChunks.some((c) => c.kind === "figure_caption");
  const hasEquations = paperChunks.some((c) => c.kind === "equation");
  const pillarPlan = await planPillars({
    paperTitle: input.paperTitle,
    archetype,
    hasFigures,
    hasEquations,
    contextBlock,
  });

  const pillarNodes: GraphNode[] = pillarPlan.pillars.map((pillar, i) => ({
    id: `${input.paperId}-pillar-${pillar.key}`,
    workspaceId: input.workspaceId,
    type: "pillar",
    title: pillar.title,
    bodyMd: pillar.intent,
    pillarIndex: i + 1,
    x: 0,
    y: 0,
    paperId: input.paperId,
    stale: false,
  }));
  const pillarIndexByKey = new Map(pillarPlan.pillars.map((pillar, i) => [pillar.key, i + 1] as const));

  const queue = new PQueue({ concurrency: CONCURRENCY });
  const tasks = pillarPlan.pillars.flatMap((pillar) =>
    pillar.leaves.map((leaf) => {
      const nodeId = `${input.paperId}-leaf-${pillar.key}-${leaf.key}`;
      const ctx: GeneratorContext = {
        paperTitle: input.paperTitle,
        archetype,
        contextBlock,
        customPrompt: leaf.custom_prompt,
      };
      return queue.add(() =>
        runLeaf(
          ctx,
          nodeId,
          input.workspaceId,
          input.paperId,
          pillarIndexByKey.get(pillar.key) ?? null,
          paperChunks,
          paperNumerics,
          pillar.key,
          leaf.key,
          leaf.generator,
        ),
      ) as Promise<LeafResult>;
    }),
  );

  const leaves = await Promise.all(tasks);

  return { archetype, pillarPlan, pillarNodes, leaves };
}
