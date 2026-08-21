import "server-only";
import PQueue from "p-queue";
import type { Chunk, Evidence, GraphNode, Numeric, PaperArchetype } from "@/types/anchor";
import type { PillarPlan } from "@/lib/schemas";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import { classifyArchetype } from "./archetypeClassifier";
import { planPillars } from "./pillarPlanner";
import { GENERATORS, runGenerator, type GeneratorContext } from "./generators";
import { verifyAndBindClaims } from "@/lib/services/verify";

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

/**
 * Issue #263: PillarPlanSchema only requires `key: z.string()`, no
 * uniqueness constraint -- but every node id and the pillarIndexByKey Map
 * below are derived straight from these LLM-chosen strings. Two pillars
 * sharing a key would collide on one node id (the later one winning) and
 * silently misattribute every leaf under the earlier duplicate to the
 * wrong pillar index (Map last-write-wins); two leaves sharing a key under
 * colliding pillars would collide the same way. The planner's own prompt
 * only warns against restating the same *concept* under different titles,
 * never about key identity, so this is enforced here instead of trusted.
 */
function dedupeKey(key: string, seen: Set<string>): string {
  if (!seen.has(key)) {
    seen.add(key);
    return key;
  }
  let suffix = 2;
  while (seen.has(`${key}-${suffix}`)) suffix++;
  const deduped = `${key}-${suffix}`;
  seen.add(deduped);
  return deduped;
}

function dedupePillarPlanKeys(plan: PillarPlan): PillarPlan {
  const seenPillarKeys = new Set<string>();
  return {
    ...plan,
    pillars: plan.pillars.map((pillar) => {
      const seenLeafKeys = new Set<string>();
      return {
        ...pillar,
        key: dedupeKey(pillar.key, seenPillarKeys),
        leaves: pillar.leaves.map((leaf) => ({ ...leaf, key: dedupeKey(leaf.key, seenLeafKeys) })),
      };
    }),
  };
}

export interface OrchestratorInput {
  workspaceId: string;
  paperId: string;
  paperTitle: string;
  /** Whole-workspace chunks/numerics; filtered internally to this paper. */
  chunks: Chunk[];
  numerics: Numeric[];
  /**
   * One entry per figure with a real caption chunk (issue #59), keyed by
   * that chunk's own ref id ("C7") so the `figures` generator can be shown
   * an image labeled with the same id it's meant to cite. Not persisted
   * anywhere -- see GeneratorContext.images's doc comment.
   */
  figureImages?: Array<{ refId: string; base64: string; mediaType: string }>;
  /**
   * Fired as each real sub-stage actually completes -- archetype
   * classification, pillar planning, then once per leaf as its generator
   * resolves (concurrency-limited, so these land spread over real elapsed
   * time, not all at once). Lets a caller (lib/services/ingest.ts) report
   * genuine incremental progress instead of only knowing "done" after the
   * entire fan-out finishes.
   */
  onProgress?: (event: { type: "archetype" | "pillars" | "leaf"; detail: string }) => void;
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
    const { bodyMd, evidence } = verifyAndBindClaims({
      nodeId,
      bodyMd: output.body_md,
      claims: output.evidence,
      chunks,
      numerics,
      idPrefix: `${nodeId}-e`,
    });

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
      followups: output.followups,
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
  input.onProgress?.({ type: "archetype", detail: archetype });

  const hasFigures = paperChunks.some((c) => c.kind === "figure_caption");
  const hasEquations = paperChunks.some((c) => c.kind === "equation");
  const pillarPlan = dedupePillarPlanKeys(
    await planPillars({
      paperTitle: input.paperTitle,
      archetype,
      hasFigures,
      hasEquations,
      contextBlock,
    }),
  );
  input.onProgress?.({ type: "pillars", detail: `${pillarPlan.pillars.length} pillars planned` });

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

  // Issue #265: the figures generator's own prompt is written for "one or
  // more" images discussed together in one node -- pillarPlanner's
  // hasFigures gate is a single boolean ("skip figures if none are
  // extractable"), so the intended shape is at most one figures leaf per
  // paper. Nothing in the schema actually enforces that, though: if a plan
  // ever did include two figures leaves, broadcasting the *entire*
  // figureImages set to both (as this used to do unconditionally) would give
  // them identical input with no way to tell which figure either is meant to
  // discuss, likely duplicating the same content twice. Only the first
  // figures-type leaf encountered gets the real images; any further one
  // falls through to its generator's own existing "you were given no
  // images, say so plainly" instruction instead of silently duplicating.
  let figuresImagesClaimed = false;

  const queue = new PQueue({ concurrency: CONCURRENCY });
  const tasks = pillarPlan.pillars.flatMap((pillar) =>
    pillar.leaves.map((leaf) => {
      const nodeId = `${input.paperId}-leaf-${pillar.key}-${leaf.key}`;
      const givesImages = leaf.generator === "figures" && !figuresImagesClaimed;
      if (givesImages) figuresImagesClaimed = true;
      const ctx: GeneratorContext = {
        paperTitle: input.paperTitle,
        archetype,
        contextBlock,
        customPrompt: leaf.custom_prompt,
        images: givesImages ? input.figureImages : undefined,
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
      ).then((result) => {
        const r = result as LeafResult;
        input.onProgress?.({ type: "leaf", detail: `${leaf.title} (${r.status})` });
        return r;
      }) as Promise<LeafResult>;
    }),
  );

  const leaves = await Promise.all(tasks);

  return { archetype, pillarPlan, pillarNodes, leaves };
}
