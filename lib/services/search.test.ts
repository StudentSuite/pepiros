import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { buildRefIndex } from "@/lib/grounding/anchor";
import { paperCoverage, paperNumericLedger, searchPaper } from "./search";

const workspace = workspaceFixture as unknown as Workspace;
const WS = workspace.id;

describe("searchPaper", () => {
  it("finds the chunk that actually contains the query terms", async () => {
    const hits = await searchPaper({ workspaceId: WS, query: "randomized bright light" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.text.toLowerCase()).toContain("randomized");
  });

  // The whole point of returning refIds is that a caller can cite them and
  // have them resolve. If search invented an id the verifier can't resolve,
  // every citation built from a search result would log hallucinated_ref.
  it("returns refIds that buildRefIndex can actually resolve", async () => {
    const refIndex = buildRefIndex(workspace.chunks, workspace.numerics);
    const hits = await searchPaper({ workspaceId: WS, query: "sleep latency circadian", k: 10 });

    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(refIndex.has(hit.refId), `unresolvable refId ${hit.refId}`).toBe(true);
    }
  });

  it("scopes to one paper when paperId is given", async () => {
    const hits = await searchPaper({ workspaceId: WS, query: "sleep", paperId: "p1", k: 10 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.paperId === "p1")).toBe(true);
  });

  it("respects k", async () => {
    const hits = await searchPaper({ workspaceId: WS, query: "the of a", k: 2 });
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("returns the verbatim chunk text and a pre-rendered citation line", async () => {
    const hits = await searchPaper({ workspaceId: WS, query: "randomized", k: 1 });
    const hit = hits[0]!;
    const chunk = workspace.chunks.find((c) => c.id === hit.chunkId)!;

    expect(hit.text).toBe(chunk.text); // verbatim, not truncated or paraphrased
    expect(hit.line).toBe(`[C${chunk.ordinal} | Methods | p.${chunk.page}] ${chunk.text}`);
  });

  it("ranks a chunk covering more query terms above one covering fewer", async () => {
    const hits = await searchPaper({ workspaceId: WS, query: "sleep onset latency decreased", k: 10 });
    expect(hits.length).toBeGreaterThan(1);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
    }
  });

  it("is deterministic across repeated identical queries", async () => {
    const a = await searchPaper({ workspaceId: WS, query: "circadian misalignment", k: 5 });
    const b = await searchPaper({ workspaceId: WS, query: "circadian misalignment", k: 5 });
    expect(a.map((h) => h.refId)).toEqual(b.map((h) => h.refId));
  });

  it("returns empty for a query with no matching terms, rather than everything", async () => {
    const hits = await searchPaper({ workspaceId: WS, query: "zzzz-nonexistent-token" });
    expect(hits).toHaveLength(0);
  });

  it("returns empty for an all-punctuation query", async () => {
    expect(await searchPaper({ workspaceId: WS, query: "???" })).toHaveLength(0);
  });
});

describe("paperNumericLedger", () => {
  it("returns a paper's numerics with resolvable N-refs", async () => {
    const refIndex = buildRefIndex(workspace.chunks, workspace.numerics);
    const ledger = await paperNumericLedger(WS, "p1");

    expect(ledger.length).toBeGreaterThan(0);
    for (const row of ledger) {
      expect(refIndex.has(row.refId), `unresolvable ${row.refId}`).toBe(true);
    }
  });

  it("excludes numerics belonging to other papers", async () => {
    const p1 = await paperNumericLedger(WS, "p1");
    const p1ChunkIds = new Set(workspace.chunks.filter((c) => c.paperId === "p1").map((c) => c.id));
    expect(p1.every((row) => p1ChunkIds.has(row.chunkId))).toBe(true);
  });
});

describe("paperCoverage", () => {
  it("reports anchored-chunk coverage as a 0-1 fraction", async () => {
    const coverage = await paperCoverage(WS, "p1");
    expect(coverage.totalChunks).toBeGreaterThan(0);
    expect(coverage.coverage).toBeGreaterThanOrEqual(0);
    expect(coverage.coverage).toBeLessThanOrEqual(1);
    expect(coverage.anchoredChunks).toBeLessThanOrEqual(coverage.totalChunks);
  });

  it("does not count a dropped anchor as coverage", async () => {
    // e6 is the fixture's planted misattribution: unsupported, anchor null.
    // If a dropped anchor counted, p2's coverage would overstate grounding.
    const coverage = await paperCoverage(WS, "p2");
    expect(coverage.anchoredChunks).toBeLessThan(coverage.totalChunks);
  });

  it("returns 0 coverage for an unknown paper rather than dividing by zero", async () => {
    const coverage = await paperCoverage(WS, "no-such-paper");
    expect(coverage).toEqual({ totalChunks: 0, anchoredChunks: 0, coverage: 0 });
  });
});
