import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { buildRefIndex } from "@/lib/grounding/anchor";
import { buildContextBlock, formatChunkLine, formatNumericLine } from "./contextBlock";

const workspace = workspaceFixture as unknown as Workspace;

describe("buildContextBlock", () => {
  it("includes only the requested paper's chunks and numerics", () => {
    const block = buildContextBlock("p1", workspace.chunks, workspace.numerics);

    const p1Chunks = workspace.chunks.filter((c) => c.paperId === "p1");
    const p2Chunks = workspace.chunks.filter((c) => c.paperId === "p2");

    for (const chunk of p1Chunks) {
      expect(block).toContain(chunk.text);
    }
    for (const chunk of p2Chunks) {
      expect(block).not.toContain(chunk.text);
    }
  });

  it("emits every id in a form buildRefIndex can resolve", () => {
    const block = buildContextBlock("p1", workspace.chunks, workspace.numerics);
    const refIndex = buildRefIndex(workspace.chunks, workspace.numerics);

    const ids = [...block.matchAll(/\[([CN]\d+) \|/g)].map((m) => m[1]!);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(refIndex.has(id), `context block emitted unresolvable id ${id}`).toBe(true);
    }
  });

  it("orders chunks before numerics, both by ordinal", () => {
    const block = buildContextBlock("p1", workspace.chunks, workspace.numerics);
    const ids = [...block.matchAll(/\[([CN]\d+) \|/g)].map((m) => m[1]!);

    const firstNumericIndex = ids.findIndex((id) => id.startsWith("N"));
    const lastChunkIndex = ids.map((id) => id.startsWith("C")).lastIndexOf(true);
    expect(firstNumericIndex).toBeGreaterThan(lastChunkIndex);
  });
});

describe("formatChunkLine / formatNumericLine", () => {
  it("titlecases the section slug and includes the page number", () => {
    const chunk = workspace.chunks.find((c) => c.id === "c-p1-methods-1")!;
    expect(formatChunkLine(chunk)).toBe(
      `[C${chunk.ordinal} | Methods | p.${chunk.page}] ${chunk.text}`,
    );
  });

  it("falls back to Unsectioned when a chunk has no section", () => {
    const chunk = { ...workspace.chunks[0]!, sectionId: null };
    expect(formatChunkLine(chunk)).toContain("| Unsectioned |");
  });

  it("formats a numeric line using its owning chunk's section/page", () => {
    const numeric = workspace.numerics[0]!;
    const chunk = workspace.chunks.find((c) => c.id === numeric.chunkId)!;
    expect(formatNumericLine(numeric, chunk)).toBe(
      `[N${numeric.ordinal} | ${formatChunkLine(chunk).split(" | ")[1]} | p.${chunk.page}] ${numeric.rawText}`,
    );
  });
});
