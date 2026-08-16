// Runs golden test cases from evals/cases.json against the real generator
// pipeline (plan.md §8: "each generator gets its own retrieval query, token
// budget, output shape, and one golden test"). Distinct from
// scripts/measure-drop-rate.ts, which runs the FULL per-paper pillar-plan
// pipeline against real PDFs for an aggregate drop-rate number -- this
// targets one named generator at a time against the fixture's own
// already-curated papers, checking real structural invariants (does at
// least one claim actually survive re-verification, are banned generic-
// critique phrases actually absent) rather than judging prose quality. That
// judgment is a human content-review task (see cases.json's own header
// comment) this script deliberately does not fabricate a stand-in for --
// add more cases here once a generator's real output has actually been
// reviewed, not before.
//
// Usage:
//   npx tsx --env-file=.env --conditions=react-server evals/run.ts
//
// Needs GROQ_API_KEY or FEATHERLESS_API_KEY set, and costs real model calls
// proportional to the case count -- this is a real measurement, not a mock.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import workspaceFixture from "@/fixtures/workspace.json";
import type { Workspace } from "@/types/anchor";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import { BANNED_GENERIC_CRITIQUE_PHRASES } from "@/lib/agents/generators/weaknesses";

interface GoldenCaseExpectations {
  /** At least one claim must resolve to quote_located/paraphrase, not every claim unsupported. Defaults true. */
  requiresSupportedEvidence?: boolean;
  /** Checked against BANNED_GENERIC_CRITIQUE_PHRASES (weaknesses.ts) -- only meaningful for generators that share that list. */
  noBannedPhrases?: boolean;
  /** Defaults to 2, matching runGenerator.ts's shared prompt contract ("followups are 2-4 short questions"). */
  minFollowups?: number;
}

interface GoldenCase {
  name: string;
  generator: string;
  paperId: string;
  expect: GoldenCaseExpectations;
}

interface CaseResult {
  name: string;
  generator: string;
  passed: boolean;
  failures: string[];
}

async function runCase(workspace: Workspace, testCase: GoldenCase): Promise<CaseResult> {
  const { GENERATORS, runGenerator, findBannedPhrases } = await import("@/lib/agents/generators");
  const { verifyAndBindClaims } = await import("@/lib/services/verify");

  const failures: string[] = [];
  const config = GENERATORS[testCase.generator as keyof typeof GENERATORS];
  if (!config) {
    return { name: testCase.name, generator: testCase.generator, passed: false, failures: [`generator "${testCase.generator}" is not registered in lib/agents/generators`] };
  }

  const paper = workspace.papers.find((p) => p.id === testCase.paperId);
  if (!paper) {
    return { name: testCase.name, generator: testCase.generator, passed: false, failures: [`paper "${testCase.paperId}" not found in the fixture`] };
  }

  const contextBlock = buildContextBlock(paper.id, workspace.chunks, workspace.numerics);
  const output = await runGenerator(config, {
    paperTitle: paper.title,
    archetype: paper.archetype ?? "method_paper",
    contextBlock,
  });

  const nodeId = `eval-${testCase.generator}-${paper.id}`;
  const { evidence } = verifyAndBindClaims({
    nodeId,
    bodyMd: output.body_md,
    claims: output.evidence,
    chunks: workspace.chunks,
    numerics: workspace.numerics,
    idPrefix: `${nodeId}-e`,
  });

  if (testCase.expect.requiresSupportedEvidence !== false) {
    const supported = evidence.some((e) => e.tier !== "unsupported");
    if (!supported) failures.push("every claim resolved unsupported -- no real citation survived re-verification");
  }

  if (testCase.expect.noBannedPhrases) {
    const found = findBannedPhrases(output.body_md, [...BANNED_GENERIC_CRITIQUE_PHRASES]);
    if (found.length > 0) failures.push(`banned generic-critique phrase(s) present: ${found.join(", ")}`);
  }

  const minFollowups = testCase.expect.minFollowups ?? 2;
  if (output.followups.length < minFollowups) {
    failures.push(`only ${output.followups.length} followup(s), expected at least ${minFollowups}`);
  }

  return { name: testCase.name, generator: testCase.generator, passed: failures.length === 0, failures };
}

async function main() {
  const casesPath = path.join(process.cwd(), "evals", "cases.json");
  const { cases } = JSON.parse(readFileSync(casesPath, "utf-8")) as { cases: GoldenCase[] };
  if (!cases || cases.length === 0) {
    console.error("evals/cases.json has no cases. See its own header comment.");
    process.exit(2);
  }

  const workspace = workspaceFixture as unknown as Workspace;
  const results: CaseResult[] = [];
  for (const testCase of cases) {
    console.log(`Running ${testCase.name} (${testCase.generator})...`);
    try {
      results.push(await runCase(workspace, testCase));
    } catch (err) {
      results.push({
        name: testCase.name,
        generator: testCase.generator,
        passed: false,
        failures: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(`\n=== Golden case report ===`);
  console.log(`${passed}/${results.length} passed`);
  for (const r of results) {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}`);
    for (const f of r.failures) console.log(`      ${f}`);
  }

  const outDir = path.join(process.cwd(), "evals", "results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `golden-cases-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${outPath}`);

  if (passed < results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
