import { describe, expect, it, vi } from "vitest";
import type { Evidence, Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { runOrchestrator } from "./orchestrator";
import { planPillars } from "./pillarPlanner";

const workspace = workspaceFixture as unknown as Workspace;
const chunkC1 = workspace.chunks.find((c) => c.paperId === "p1" && c.ordinal === 1)!;

vi.mock("./archetypeClassifier", () => ({
  classifyArchetype: vi.fn(async () => "rct"),
}));

vi.mock("./pillarPlanner", () => ({
  planPillars: vi.fn(async () => ({
    archetype: "rct",
    reasoning: "test reasoning",
    pillars: [
      {
        key: "methods",
        title: "Methods",
        intent: "methods intent",
        priority: 1,
        leaves: [
          { key: "m1", title: "Randomization", generator: "methodology", rationale: "r" },
          { key: "m2", title: "Not built yet", generator: "biases", rationale: "r" },
          { key: "m3", title: "Will fail", generator: "summary", rationale: "r" },
        ],
      },
    ],
  })),
}));

vi.mock("./generators", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./generators")>();
  return {
    ...actual,
    // Deliberately omits "biases" -- exercises the unimplemented-generator path.
    GENERATORS: {
      methodology: { name: "methodology", model: vi.fn(), systemPrompt: "" },
      summary: { name: "summary", model: vi.fn(), systemPrompt: "" },
      figures: { name: "figures", model: vi.fn(), systemPrompt: "" },
    },
    runGenerator: vi.fn(async (config: { name: string }) => {
      if (config.name === "summary") throw new Error("simulated generator failure");
      return {
        title: "Randomization protocol",
        body_md: "Participants were randomized. [^n0] Multiple facts combined. [^n1]",
        evidence: [
          // Single-ref claim, exact quote -> quote_located. Ref given as the full
          // bracketed header, not the bare id -- reproduces exactly what a real
          // model returned live while building this (despite the prompt asking
          // for the bare id), regression-testing orchestrator.ts's normalizeRef.
          { refs: ["C1 | Methods | p.4"], quote: chunkC1.text },
          // Multi-ref (aggregate) claim: same quote checked against two different
          // chunks independently -- C1 matches (it's verbatim), C2 doesn't, so this
          // becomes two Evidence rows with two different outcomes.
          { refs: ["C1 | Methods | p.4", "C2 | Results | p.5"], quote: chunkC1.text },
        ],
        confidence: "high",
        followups: [],
      };
    }),
  };
});

describe("runOrchestrator", () => {
  it("classifies archetype, plans pillars, and builds pillar nodes", async () => {
    const result = await runOrchestrator({
      workspaceId: "ws-1",
      paperId: "p1",
      paperTitle: "Test Paper",
      chunks: workspace.chunks,
      numerics: workspace.numerics,
    });

    expect(result.archetype).toBe("rct");
    expect(result.pillarNodes).toHaveLength(1);
    expect(result.pillarNodes[0]).toMatchObject({
      id: "p1-pillar-methods",
      type: "pillar",
      title: "Methods",
      pillarIndex: 1,
      paperId: "p1",
    });
  });

  it("isolates a failing generator without affecting sibling leaves", async () => {
    const result = await runOrchestrator({
      workspaceId: "ws-1",
      paperId: "p1",
      paperTitle: "Test Paper",
      chunks: workspace.chunks,
      numerics: workspace.numerics,
    });

    const failed = result.leaves.find((l) => l.leafKey === "m3")!;
    expect(failed.status).toBe("failed");
    expect(failed.error).toContain("simulated generator failure");
    expect(failed.node).toBeUndefined();
  });

  it("reports a plan referencing an unimplemented generator without crashing", async () => {
    const result = await runOrchestrator({
      workspaceId: "ws-1",
      paperId: "p1",
      paperTitle: "Test Paper",
      chunks: workspace.chunks,
      numerics: workspace.numerics,
    });

    const unimplemented = result.leaves.find((l) => l.leafKey === "m2")!;
    expect(unimplemented.status).toBe("unimplemented");
    expect(unimplemented.generator).toBe("biases");
  });

  it("re-verifies a multi-ref claim per-ref, keeping the surviving marker and dropping the failed one", async () => {
    const result = await runOrchestrator({
      workspaceId: "ws-1",
      paperId: "p1",
      paperTitle: "Test Paper",
      chunks: workspace.chunks,
      numerics: workspace.numerics,
    });

    const ok = result.leaves.find((l) => l.leafKey === "m1")!;
    expect(ok.status).toBe("ok");
    expect(ok.evidence).toHaveLength(3);

    const [e1, e2, e3] = ok.evidence! as [Evidence, Evidence, Evidence];
    expect(e1).toMatchObject({ refId: "C1", tier: "quote_located" });
    expect(e2).toMatchObject({ refId: "C1", tier: "quote_located" });
    expect(e3).toMatchObject({ refId: "C2", tier: "unsupported", anchor: null });

    // e1/e2 both survive (single-ref claim + the C1 half of the aggregate claim);
    // e3 (the C2 half, unsupported) is stripped from the rendered body.
    expect(ok.node!.bodyMd).toBe(`Participants were randomized. [^${e1.id}] Multiple facts combined. [^${e2.id}]`);
    expect(ok.node!.bodyMd).not.toContain(e3.id);
  });

  // Issue #263: PillarPlanSchema has no uniqueness constraint on pillar/leaf
  // keys. Two pillars sharing a key used to collide on one node id and
  // silently misattribute every leaf under the earlier duplicate to the
  // wrong pillar index (a Map keyed by pillar.key is last-write-wins).
  it("dedupes colliding pillar/leaf keys from the planner instead of colliding node ids and pillar attribution", async () => {
    vi.mocked(planPillars).mockResolvedValueOnce({
      archetype: "rct",
      reasoning: "test reasoning",
      pillars: [
        {
          key: "methods",
          title: "Methods A",
          intent: "first methods pillar",
          priority: 1,
          // Same leaf key ("m1") reused across the two colliding pillars --
          // safe once pillar keys are unique (the leaf node id combines
          // both), so no cross-pillar leaf dedup should even be needed here.
          leaves: [{ key: "m1", title: "Randomization", generator: "methodology", rationale: "r" }],
        },
        {
          key: "methods",
          title: "Methods B",
          intent: "second methods pillar, same key",
          priority: 2,
          leaves: [{ key: "m1", title: "Blinding", generator: "methodology", rationale: "r" }],
        },
      ],
    });

    const result = await runOrchestrator({
      workspaceId: "ws-1",
      paperId: "p1",
      paperTitle: "Test Paper",
      chunks: workspace.chunks,
      numerics: workspace.numerics,
    });

    // Two distinct pillar nodes, not one clobbering the other, and each
    // keeps its own real pillarIndex (1 and 2, not both resolving to 1).
    expect(result.pillarNodes).toHaveLength(2);
    expect(result.pillarNodes.map((n) => n.id)).toEqual(["p1-pillar-methods", "p1-pillar-methods-2"]);
    expect(result.pillarNodes[0]!.pillarIndex).toBe(1);
    expect(result.pillarNodes[1]!.pillarIndex).toBe(2);

    // Also confirms the leaf node ids themselves stayed distinct (pillar-key
    // half of the id disambiguates them even though both share leaf key "m1").
    expect(result.leaves.map((l) => l.node?.id)).toEqual([
      "p1-leaf-methods-m1",
      "p1-leaf-methods-2-m1",
    ]);

    // Both leaves ran (neither silently dropped by an id collision), each
    // correctly attributed to its own pillar's index.
    expect(result.leaves).toHaveLength(2);
    expect(result.leaves[0]!.node!.pillarIndex).toBe(1);
    expect(result.leaves[1]!.node!.pillarIndex).toBe(2);
  });

  // Issue #265: figureImages used to broadcast to every "figures"-generator
  // leaf unconditionally. Nothing in the schema caps a plan to one figures
  // leaf, so two of them used to receive identical images with no way to
  // tell which figure either was meant to discuss.
  it("only gives the real figureImages to the first figures-generator leaf, not every one", async () => {
    vi.mocked(planPillars).mockResolvedValueOnce({
      archetype: "rct",
      reasoning: "test reasoning",
      pillars: [
        {
          key: "results",
          title: "Results",
          intent: "results intent",
          priority: 1,
          leaves: [
            { key: "f1", title: "Figure 1", generator: "figures", rationale: "r" },
            { key: "f2", title: "Figure 2", generator: "figures", rationale: "r" },
          ],
        },
      ],
    });

    const figureImages = [{ refId: "C1", base64: "abc", mediaType: "image/png" }];
    const receivedImages: Array<unknown[] | undefined> = [];
    const { runGenerator } = await import("./generators");
    vi.mocked(runGenerator).mockImplementation(async (_config, ctx) => {
      receivedImages.push(ctx.images);
      return {
        title: "Figure discussion",
        body_md: "Shows a result. [^n0]",
        evidence: [{ refs: ["C1"], quote: chunkC1.text }],
        confidence: "high",
        followups: [],
      };
    });

    await runOrchestrator({
      workspaceId: "ws-1",
      paperId: "p1",
      paperTitle: "Test Paper",
      chunks: workspace.chunks,
      numerics: workspace.numerics,
      figureImages,
    });

    expect(receivedImages).toEqual([figureImages, undefined]);
  });
});
