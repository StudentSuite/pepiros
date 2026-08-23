import { describe, expect, it } from "vitest";
import { resolveInlineRefs, stripRefMarkers } from "./inlineRefs";
import type { Evidence } from "@/types/anchor";

function evidence(id: string, refId: string): Evidence {
  return { id, nodeId: "n1", refId, anchor: null, tier: "quote_located", matchScore: 0.95, numericOk: null };
}

describe("stripRefMarkers", () => {
  it("strips the short-form marker the fixture uses (e.g. [^e2])", () => {
    expect(stripRefMarkers("A claim.[^e2] More text.")).toBe("A claim. More text.");
  });

  // Observed live against a real ingested paper: lib/services/verify.ts
  // mints evidence ids as `${nodeId}-e${n}`, so the real bound marker is the
  // long, node-prefixed form -- not the short one the fixture happens to use.
  it("strips the long, node-prefixed marker real ingestion actually produces", () => {
    const body = "Symptomatic tachycardia [^paper-a0383c28-leaf-gen_risk-risk_assess-e2], a variant.";
    expect(stripRefMarkers(body)).toBe("Symptomatic tachycardia , a variant.");
  });

  it("collapses the double space a stripped marker can leave behind", () => {
    expect(stripRefMarkers("word [^e1] word")).toBe("word word");
  });
});

describe("resolveInlineRefs", () => {
  it("resolves short-form markers in first-seen order", () => {
    const ev = [evidence("e1", "C1"), evidence("e2", "C2")];
    const resolved = resolveInlineRefs("[^e2] then [^e1]", ev);
    expect(resolved.map((e) => e.id)).toEqual(["e2", "e1"]);
  });

  it("resolves the long, node-prefixed markers real ingestion produces", () => {
    const id = "paper-a0383c28-leaf-gen_risk-risk_assess-e2";
    const ev = [evidence(id, "C5")];
    const resolved = resolveInlineRefs(`Some claim [^${id}] here.`, ev);
    expect(resolved).toEqual([ev[0]]);
  });

  it("skips a dangling marker with no matching evidence row", () => {
    const resolved = resolveInlineRefs("[^e404]", [evidence("e1", "C1")]);
    expect(resolved).toEqual([]);
  });

  it("de-duplicates a marker repeated in the body", () => {
    const ev = [evidence("e1", "C1")];
    const resolved = resolveInlineRefs("[^e1] and again [^e1]", ev);
    expect(resolved).toEqual([ev[0]]);
  });
});
