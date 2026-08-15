import { describe, expect, it } from "vitest";
import {
  detailLevelFor,
  LOD_FULL_THRESHOLD,
  LOD_TITLE_THRESHOLD,
  showsBody,
  showsTitle,
} from "./lod";

describe("detailLevelFor", () => {
  it("drops to blocks when zoomed far out", () => {
    expect(detailLevelFor(0.2)).toBe("minimal");
    expect(detailLevelFor(0.44)).toBe("minimal");
  });

  it("shows titles in the middle band", () => {
    expect(detailLevelFor(LOD_TITLE_THRESHOLD)).toBe("title");
    expect(detailLevelFor(0.6)).toBe("title");
  });

  it("shows everything at normal zoom and above", () => {
    expect(detailLevelFor(LOD_FULL_THRESHOLD)).toBe("full");
    expect(detailLevelFor(1)).toBe("full");
    expect(detailLevelFor(2)).toBe("full");
  });

  it("is monotonic: zooming in never removes detail", () => {
    const rank = { minimal: 0, title: 1, full: 2 } as const;
    let previous = -1;
    for (let z = 0.1; z <= 2; z += 0.05) {
      const current = rank[detailLevelFor(z)];
      expect(current, `detail decreased at zoom ${z.toFixed(2)}`).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  // React Flow reports zoom from a transform that is briefly undefined during
  // init; falling back to "minimal" would flash every card into a block.
  it("falls back to full detail for a non-finite zoom", () => {
    expect(detailLevelFor(Number.NaN)).toBe("full");
    expect(detailLevelFor(Number.POSITIVE_INFINITY)).toBe("full");
  });
});

describe("showsTitle / showsBody", () => {
  it("keeps titles one band longer than bodies", () => {
    expect(showsTitle("title")).toBe(true);
    expect(showsBody("title")).toBe(false);
  });

  it("shows both at full and neither at minimal", () => {
    expect(showsTitle("full") && showsBody("full")).toBe(true);
    expect(showsTitle("minimal") || showsBody("minimal")).toBe(false);
  });
});
