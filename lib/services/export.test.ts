import { describe, expect, it } from "vitest";
import { exportWorkspaceBibtex, exportWorkspaceMarkdown } from "./export";

describe("exportWorkspaceMarkdown", () => {
  it("includes every paper's title and its leaf bodies", async () => {
    const md = await exportWorkspaceMarkdown("ws-1");
    expect(md).toContain("# Circadian Rhythm & Cognition");
    expect(md).toContain("Morning Bright Light");
  });

  it("emits a footnote definition for every anchored evidence row, matched to its [^id] marker", async () => {
    const md = await exportWorkspaceMarkdown("ws-1");
    const markerMatches = [...md.matchAll(/\[\^(e[\w-]+)\]/g)].map((m) => m[1]);
    expect(markerMatches.length).toBeGreaterThan(0);

    for (const id of new Set(markerMatches)) {
      expect(md).toContain(`[^${id}]:`);
    }
  });

  it("does not emit a footnote definition for a dropped (unsupported) anchor", async () => {
    const md = await exportWorkspaceMarkdown("ws-1");
    // "unsupported" evidence has anchor: null and is excluded from the
    // footnote list entirely -- there is no located quote to cite.
    expect(md).not.toMatch(/-- unsupported\)/);
  });
});

describe("exportWorkspaceBibtex", () => {
  it("emits one @article entry per paper with a verbatim quote appendix", async () => {
    const bib = await exportWorkspaceBibtex("ws-1");
    expect(bib).toContain("@article{");
    expect(bib).toMatch(/title = \{.+\}/);
    expect(bib).toContain("% Verbatim quotes for");
  });

  it("quote appendix lines are BibTeX comments, inert to a real parser", async () => {
    const bib = await exportWorkspaceBibtex("ws-1");
    const quoteLines = bib.split("\n").filter((l) => l.includes('"'));
    expect(quoteLines.length).toBeGreaterThan(0);
    expect(quoteLines.every((l) => l.trimStart().startsWith("%"))).toBe(true);
  });
});
