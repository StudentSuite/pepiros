import { describe, expect, it } from "vitest";
import type { Evidence, GraphNode } from "@/types/anchor";
import { leafNodesCitingChunks } from "./selectionAudit";

function node(id: string): GraphNode {
  return {
    id,
    workspaceId: "ws-1",
    type: "leaf",
    title: id,
    bodyMd: "",
    pillarIndex: null,
    x: 0,
    y: 0,
    paperId: "p-1",
    stale: false,
  };
}

function evidence(id: string, nodeId: string, chunkId: string | null): Evidence {
  return {
    id,
    nodeId,
    refId: "C1",
    anchor: chunkId ? { chunkId, quote: "q", spans: [] } : null,
    tier: chunkId ? "quote_located" : "unsupported",
    matchScore: 0.95,
    numericOk: null,
  };
}

describe("leafNodesCitingChunks", () => {
  it("returns leaf nodes whose evidence anchors to one of the given chunks", () => {
    const nodes = [node("n1"), node("n2"), node("n3")];
    const ev = [evidence("e1", "n1", "c1"), evidence("e2", "n2", "c2"), evidence("e3", "n3", "c3")];
    expect(leafNodesCitingChunks(nodes, ev, new Set(["c1", "c3"]))).toEqual([nodes[0], nodes[2]]);
  });

  it("returns nothing for an empty chunk set", () => {
    const nodes = [node("n1")];
    const ev = [evidence("e1", "n1", "c1")];
    expect(leafNodesCitingChunks(nodes, ev, new Set())).toEqual([]);
  });

  it("ignores evidence with no anchor", () => {
    const nodes = [node("n1")];
    const ev = [evidence("e1", "n1", null)];
    expect(leafNodesCitingChunks(nodes, ev, new Set(["c1"]))).toEqual([]);
  });

  it("does not duplicate a node cited by more than one matching evidence row", () => {
    const nodes = [node("n1")];
    const ev = [evidence("e1", "n1", "c1"), evidence("e2", "n1", "c2")];
    expect(leafNodesCitingChunks(nodes, ev, new Set(["c1", "c2"]))).toEqual([nodes[0]]);
  });
});
