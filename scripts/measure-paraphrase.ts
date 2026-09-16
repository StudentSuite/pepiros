// Issue #410: does the lexical matcher survive real paraphrase-then-cite
// writing, before audit_draft (#411) gets built on top of it?
//
// lib/grounding/verify.ts's token_set_ratio threshold (0.75 for "paraphrase",
// below that the citation is dropped as unsupported) was tuned against a
// model's own quoting behavior. audit_draft runs the same scorer against
// sentences a person wrote and cited correctly. If a real paraphrase lands
// under 0.75, the tool flags a true positive as unsupported -- for a
// misconduct-risk tool, that's worse than not building it.
//
// This is the harness only, no fixture data ships with it. Point it at 8-10
// real paraphrased-and-cited sentence/source pairs (issue #410: from an
// actual Extended Essay draft, not synthetic ones) -- see
// scripts/fixtures/paraphrase-pairs.example.json for the shape.
//
// Usage:
//   npx tsx scripts/measure-paraphrase.ts [fixture.json]
// Defaults to scripts/fixtures/paraphrase-pairs.json (gitignored -- it's a
// draft's real text, not something to publish).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Chunk, Numeric } from "@/types/anchor";
import { auditSentence, prepareCorpus } from "@/lib/grounding/reverseAudit";
import { normalize, tokenSetRatio } from "@/lib/grounding/fuzzy";
import { PARAPHRASE_THRESHOLD, QUOTE_LOCATED_THRESHOLD } from "@/lib/grounding/verify";

interface FixturePair {
  id: string;
  /** The paraphrased, correctly-cited sentence, as written. */
  sentence: string;
  /** The real source text it's paraphrasing, copied verbatim from the paper. */
  sourceText: string;
}

interface PairResult {
  id: string;
  /** tokenSetRatio(sentence, its own real source) -- the number #410 asks for. */
  directScore: number;
  directTier: string;
  /**
   * Whether a full-corpus sweep (built from every pair's source, so each
   * sentence has decoys to be confused with) lands on this pair's own chunk
   * as the best match, not just whether the direct score clears threshold.
   */
  sweepFoundCorrectChunk: boolean;
  sweepScore: number;
  sweepTier: string;
}

function tierFromScore(score: number): string {
  if (score >= QUOTE_LOCATED_THRESHOLD) return "quote_located";
  if (score >= PARAPHRASE_THRESHOLD) return "paraphrase";
  return "unsupported";
}

function loadFixture(fixturePath: string): FixturePair[] {
  if (!existsSync(fixturePath)) {
    console.error(`No fixture at ${fixturePath}.`);
    console.error("See scripts/fixtures/paraphrase-pairs.example.json for the shape.");
    console.error(
      "Issue #410 needs 8-10 real paraphrased-and-cited sentence/source pairs from an actual Extended Essay draft, not synthetic ones.",
    );
    process.exit(2);
  }
  return JSON.parse(readFileSync(fixturePath, "utf-8"));
}

function main() {
  const fixturePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(process.cwd(), "scripts", "fixtures", "paraphrase-pairs.json");
  const pairs = loadFixture(fixturePath);

  if (pairs.length < 8) {
    console.warn(`Warning: only ${pairs.length} pairs. Issue #410 asks for 8-10.`);
  }

  const chunks: Chunk[] = pairs.map((p, i) => ({
    id: p.id,
    paperId: "fixture",
    sectionId: null,
    kind: "prose",
    page: 0,
    text: p.sourceText,
    ordinal: i + 1,
    rects: [],
  }));
  const numerics: Numeric[] = [];
  const corpus = prepareCorpus(chunks, numerics);

  const results: PairResult[] = pairs.map((p) => {
    const directScore = tokenSetRatio(normalize(p.sentence), normalize(p.sourceText));
    const swept = auditSentence(p.sentence, corpus);
    return {
      id: p.id,
      directScore,
      directTier: tierFromScore(directScore),
      sweepFoundCorrectChunk: swept.bestChunkId === p.id,
      sweepScore: swept.matchScore,
      sweepTier: swept.tier,
    };
  });

  const n = results.length;
  const byDirectTier = { quote_located: 0, paraphrase: 0, unsupported: 0 };
  for (const r of results) byDirectTier[r.directTier as keyof typeof byDirectTier]++;
  const survived = results.filter((r) => r.directTier !== "unsupported").length;
  const sweepCorrect = results.filter((r) => r.sweepFoundCorrectChunk).length;

  console.log("\n=== Paraphrase-survival report (issue #410) ===");
  console.log(`Pairs measured: ${n}`);
  console.log(
    `Direct score >= ${PARAPHRASE_THRESHOLD} (survives as paraphrase or better): ${survived}/${n} (${((survived / n) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  quote_located: ${byDirectTier.quote_located}, paraphrase: ${byDirectTier.paraphrase}, unsupported: ${byDirectTier.unsupported}`,
  );
  console.log(
    `Full-corpus sweep found the correct source chunk: ${sweepCorrect}/${n} (${((sweepCorrect / n) * 100).toFixed(1)}%)`,
  );
  console.log("\nPer pair:");
  for (const r of results) {
    const flag =
      r.directTier === "unsupported"
        ? "  <-- false unsupported: a real, correctly-cited sentence would be flagged"
        : "";
    console.log(
      `  ${r.id.padEnd(12)} direct=${r.directScore.toFixed(3)} (${r.directTier})  sweep=${r.sweepScore.toFixed(3)} correctChunk=${r.sweepFoundCorrectChunk}${flag}`,
    );
  }

  console.log(
    survived === n
      ? "\nOutcome: paraphrase reliably clears 0.75. audit_draft (#411) can proceed as scoped."
      : "\nOutcome: paraphrase does not reliably clear 0.75. Rework the threshold or matching approach before building audit_draft (#411).",
  );

  const outDir = path.join(process.cwd(), "evals", "results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `paraphrase-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(
    outPath,
    JSON.stringify({ n, byDirectTier, survived, sweepCorrect, results }, null, 2),
  );
  console.log(`\nWrote ${outPath}`);
}

main();
