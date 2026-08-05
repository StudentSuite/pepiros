import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { buildRefIndex } from "./anchor";
import { stripDroppedCitation, verifyClaim } from "./verify";

const workspace = workspaceFixture as unknown as Workspace;
const refIndex = buildRefIndex(workspace.chunks, workspace.numerics);

function chunkFor(refId: string) {
  const resolved = refIndex.get(refId);
  if (!resolved) throw new Error(`fixture is missing ${refId}`);
  return resolved.chunk;
}

describe("verifyClaim", () => {
  it("locates a verbatim quote", () => {
    const chunk = chunkFor("C1");
    const result = verifyClaim({ nodeId: "n-1", refId: "C1", quote: chunk.text }, refIndex);

    expect(result.tier).toBe("quote_located");
    expect(result.matchScore).toBe(1);
    expect(result.anchor?.chunkId).toBe(chunk.id);
    expect(result.hallucinatedRef).toBe(false);
  });

  it("flags a ref that resolves to nothing and keeps no anchor", () => {
    const result = verifyClaim(
      { nodeId: "n-1", refId: "C9999", quote: "anything at all" },
      refIndex,
    );

    expect(result.hallucinatedRef).toBe(true);
    expect(result.tier).toBe("unsupported");
    expect(result.anchor).toBeNull();
  });

  it("drops the anchor on a quote the chunk does not contain", () => {
    const result = verifyClaim(
      { nodeId: "n-1", refId: "C1", quote: "the mitochondrion is the powerhouse of the cell" },
      refIndex,
    );

    expect(result.tier).toBe("unsupported");
    expect(result.anchor).toBeNull();
  });

  // plan.md §4: the failure mode the floor exists for is a genuine quote
  // attached to a misstated result, which fuzzy matching alone scores 1.0.
  it("demotes an exact quote whose numbers do not check out", () => {
    const chunk = chunkFor("C2");
    const claimed = chunk.text.replace(/34/g, "62");
    const result = verifyClaim({ nodeId: "n-1", refId: "C2", quote: claimed }, refIndex);

    expect(result.numericOk).toBe(false);
    expect(result.tier).toBe("unsupported");
    expect(result.anchor).toBeNull();
  });

  it("leaves numericOk null when the claim asserts no statistic", () => {
    const chunk = chunkFor("C1");
    const result = verifyClaim({ nodeId: "n-1", refId: "C1", quote: chunk.text }, refIndex);
    expect(result.numericOk).toBeNull();
  });
});

describe("stripDroppedCitation", () => {
  it("removes the inline marker for a dropped evidence row", () => {
    expect(stripDroppedCitation("Light improved sleep[^e6] overall.", "e6")).toBe(
      "Light improved sleep overall.",
    );
  });

  it("leaves other markers alone", () => {
    expect(stripDroppedCitation("A[^e1] and B[^e2].", "e1")).toBe("A and B[^e2].");
  });
});

describe("fixture integrity", () => {
  it("gives every chunk and numeric a unique ordinal", () => {
    const chunkOrdinals = workspace.chunks.map((c) => c.ordinal);
    const numericOrdinals = workspace.numerics.map((n) => n.ordinal);
    expect(new Set(chunkOrdinals).size).toBe(chunkOrdinals.length);
    expect(new Set(numericOrdinals).size).toBe(numericOrdinals.length);
  });

  it("resolves every refId cited by an evidence row", () => {
    for (const evidence of workspace.evidence) {
      expect(refIndex.has(evidence.refId), `unresolvable ref ${evidence.refId}`).toBe(true);
    }
  });
});
