import { describe, expect, it } from "vitest";
import type { Chunk, Numeric } from "@/types/anchor";
import { auditText, prepareCorpus, splitSentences } from "./reverseAudit";
import { tokenSetRatio } from "./fuzzy";

const WORDS = [
  "circadian", "rhythm", "disruption", "cognitive", "performance", "sleep", "onset",
  "latency", "shift", "workers", "melatonin", "cortisol", "actigraphy", "polysomnography",
  "randomized", "placebo", "exposure", "baseline", "adherence", "attrition",
];

/**
 * A chunk of realistic size: plan.md's ingest targets 500-800 tokens. Scoring
 * is token-set based, so every chunk needs a distinct vocabulary or they all
 * tie and the sweep is measuring nothing.
 */
function syntheticChunk(index: number): Chunk {
  const words: string[] = [];
  for (let i = 0; i < 600; i++) {
    words.push(`${WORDS[(index * 7 + i * 3) % WORDS.length]}${(index * 31 + i) % 97}`);
  }
  return {
    id: `c-${index}`,
    paperId: `p-${index % 3}`,
    sectionId: null,
    kind: "prose",
    page: 1,
    text: words.join(" "),
    ordinal: index + 1,
    rects: [{ page: 1, x0: 0, y0: 0, x1: 10, y1: 10 }],
  };
}

describe("splitSentences", () => {
  it("splits on sentence boundaries and drops empties", () => {
    expect(splitSentences("One claim. Two claims! Three?  ")).toEqual([
      "One claim.",
      "Two claims!",
      "Three?",
    ]);
  });

  it("does not split on a decimal point inside a statistic", () => {
    expect(splitSentences("The effect was significant at p=0.003 overall.")).toHaveLength(1);
  });
});

describe("auditText", () => {
  const chunks: Chunk[] = [
    {
      id: "c-1",
      paperId: "p1",
      sectionId: null,
      kind: "prose",
      page: 4,
      text: "Participants were randomized 1:1 to receive 30 minutes of bright light exposure within one hour of waking, or a dim-light placebo.",
      ordinal: 1,
      rects: [{ page: 4, x0: 0, y0: 0, x1: 10, y1: 10 }],
    },
    {
      id: "c-2",
      paperId: "p1",
      sectionId: null,
      kind: "prose",
      page: 5,
      text: "Sleep onset latency fell by 34% in the intervention arm relative to placebo.",
      ordinal: 2,
      rects: [{ page: 5, x0: 0, y0: 0, x1: 10, y1: 10 }],
    },
  ];
  const numerics: Numeric[] = [
    {
      id: "n-1",
      chunkId: "c-2",
      rawText: "34%",
      value: 34,
      unit: "%",
      comparator: "=",
      role: "effect_size",
      ordinal: 1,
    },
  ];

  it("locates a near-verbatim sentence against its source chunk", () => {
    const [result] = auditText("Participants were randomized 1:1 to receive 30 minutes of bright light exposure within one hour of waking, or a dim-light placebo.", chunks, numerics);
    expect(result!.tier).toBe("quote_located");
    expect(result!.bestChunkId).toBe("c-1");
  });

  it("drops a sentence the corpus does not support", () => {
    const [result] = auditText("The mitochondrion is the powerhouse of the cell.", chunks, numerics);
    expect(result!.tier).toBe("unsupported");
    expect(result!.bestChunkId).toBeNull();
  });

  it("drops a real quote that restates the number wrongly", () => {
    const [result] = auditText("Sleep onset latency fell by 62% in the intervention arm relative to placebo.", chunks, numerics);
    expect(result!.numericOk).toBe(false);
    expect(result!.tier).toBe("unsupported");
  });

  it("reports the share of unsupported sentences", () => {
    const results = auditText(
      "Participants were randomized 1:1 to receive 30 minutes of bright light exposure within one hour of waking, or a dim-light placebo. The mitochondrion is the powerhouse of the cell.",
      chunks,
      numerics,
    );
    expect(results).toHaveLength(2);
    expect(results.filter((r) => r.tier === "unsupported")).toHaveLength(1);
  });
});

describe("corpus sweep cost", () => {
  // The sweep is O(sentences * chunks) candidate pairs, and scoring a pair is
  // O(chunkChars^2). Against the 18KB bundled fixture that is invisible;
  // against three real papers it was minutes. The admissible bound in
  // fuzzy.ts is what keeps this tractable, so it gets a wall-clock guard.
  it("audits 10 sentences against 300 realistic chunks quickly", () => {
    const chunks = Array.from({ length: 300 }, (_, i) => syntheticChunk(i));
    const text = Array.from(
      { length: 10 },
      (_, i) => `Sentence ${i} discusses circadian rhythm disruption and cognitive performance in shift workers.`,
    ).join(" ");

    const started = Date.now();
    const results = auditText(text, chunks, []);
    const elapsed = Date.now() - started;

    expect(results).toHaveLength(10);
    expect(elapsed).toBeLessThan(5000);
  });

  it("returns the same best chunk the exhaustive sweep would", () => {
    const chunks = Array.from({ length: 40 }, (_, i) => syntheticChunk(i));
    const corpus = prepareCorpus(chunks, []);
    expect(corpus.chunks).toHaveLength(40);

    for (const target of [chunks[0]!, chunks[17]!, chunks[39]!]) {
      const sentence = `${target.text.slice(0, 400)}.`;

      // Brute force, exactly what the prune replaced.
      let exhaustive = { id: "", score: -1 };
      for (const chunk of chunks) {
        const score = tokenSetRatio(sentence, chunk.text);
        if (score > exhaustive.score) exhaustive = { id: chunk.id, score };
      }

      const [result] = auditText(sentence, chunks, []);
      expect(result!.bestChunkId).toBe(exhaustive.id);
      expect(result!.matchScore).toBeCloseTo(exhaustive.score, 10);
    }
  });
});
