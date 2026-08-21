import { describe, expect, it } from "vitest";
import { extractCitedRefs, findCitations, toCitationSegments } from "./citations";

describe("extractCitedRefs", () => {
  it("parses ASCII markers, which is what the prompt asks for", () => {
    expect(extractCitedRefs("Latency fell [C2] and memory rose [N3].")).toEqual(["C2", "N3"]);
  });

  /**
   * The bug this module exists for. Groq's gpt-oss models answer with CJK
   * fullwidth brackets rather than the ASCII ones the prompt requests --
   * observed live against the real API. With an ASCII-only pattern, a
   * correctly-cited answer parsed to zero citations and got reported as
   * ungrounded, which is the worst possible failure for this product: it makes
   * grounded output look unsourced.
   */
  it("parses the CJK fullwidth brackets a real Groq model actually returns", () => {
    expect(extractCitedRefs("Latency fell by 34%【C2】.")).toEqual(["C2"]);
  });

  it("parses fullwidth square brackets too", () => {
    expect(extractCitedRefs("See ［C5］ for the pooled effect.")).toEqual(["C5"]);
  });

  it("handles a mix of bracket styles in one answer", () => {
    expect(extractCitedRefs("One [C1], two 【C2】, three ［N3］.")).toEqual([
      "C1",
      "C2",
      "N3",
    ]);
  });

  it("tolerates whitespace inside the brackets", () => {
    expect(extractCitedRefs("Spaced [ C7 ].")).toEqual(["C7"]);
  });

  it("accepts figure refs, which the id scheme reserves even if nothing emits them yet", () => {
    expect(extractCitedRefs("The figure [F3] shows it.")).toEqual(["F3"]);
  });

  it("dedupes while preserving first-appearance order", () => {
    expect(extractCitedRefs("[C5] then [C2] then [C5] again")).toEqual(["C5", "C2"]);
  });

  it("does not treat a full context-block header as a citation", () => {
    expect(extractCitedRefs("[C7 | Methods | p.4] is context, not a citation.")).toEqual([]);
  });

  it("returns nothing for uncited prose", () => {
    expect(extractCitedRefs("No citations here at all.")).toEqual([]);
  });

  it("ignores bracketed text that is not a ref", () => {
    expect(extractCitedRefs("[TODO] and [note] and [123]")).toEqual([]);
  });

  // Issue #286: the same "prompt is a request not a guarantee" class as the
  // CJK-bracket case above -- a model grouping several supporting excerpts
  // in one bracket (a real, plausible shape, though not live-confirmed
  // against a real transcript the way the CJK case was) used to fail the
  // whole bracket, dropping every ref inside it rather than just the ones
  // it couldn't parse.
  it("parses multiple comma-separated refs grouped in one bracket", () => {
    expect(extractCitedRefs("Both studies agree [C7, C12].")).toEqual(["C7", "C12"]);
  });

  it("parses multiple space-separated refs grouped in one bracket", () => {
    expect(extractCitedRefs("Both studies agree [C7 C12].")).toEqual(["C7", "C12"]);
  });

  it("still rejects a context-block header even with the wider multi-ref pattern", () => {
    expect(extractCitedRefs("[C7 | Methods | p.4] is context, not a citation.")).toEqual([]);
  });
});

describe("findCitations", () => {
  it("reports the span of each marker so it can be sliced out of the prose", () => {
    const text = "Fell [C2] sharply.";
    const [match] = findCitations(text);
    expect(match).toMatchObject({ refId: "C2", start: 5 });
    expect(text.slice(match!.start, match!.end)).toBe("[C2]");
  });

  it("reports correct spans for a fullwidth marker, whose brackets are still one char each", () => {
    const text = "Fell 【C2】 sharply.";
    const [match] = findCitations(text);
    expect(text.slice(match!.start, match!.end)).toBe("【C2】");
  });

  it("reports one match per ref in a grouped bracket, all sharing that bracket's span", () => {
    const text = "Both agree [C7, C12].";
    const matches = findCitations(text);
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.refId)).toEqual(["C7", "C12"]);
    expect(matches[0]!.start).toBe(matches[1]!.start);
    expect(matches[0]!.end).toBe(matches[1]!.end);
    expect(text.slice(matches[0]!.start, matches[0]!.end)).toBe("[C7, C12]");
  });
});

describe("toCitationSegments", () => {
  it("splits prose into text and citation segments", () => {
    expect(toCitationSegments("Fell 34% [C2] versus placebo.")).toEqual([
      { kind: "text", text: "Fell 34% " },
      { kind: "citation", refId: "C2" },
      { kind: "text", text: " versus placebo." },
    ]);
  });

  it("splits fullwidth markers, so a real Groq answer renders as chips not brackets", () => {
    expect(toCitationSegments("Fell 34%【C2】.")).toEqual([
      { kind: "text", text: "Fell 34%" },
      { kind: "citation", refId: "C2" },
      { kind: "text", text: "." },
    ]);
  });

  it("handles a marker at the very start and very end", () => {
    expect(toCitationSegments("[C1] mid [C2]")).toEqual([
      { kind: "citation", refId: "C1" },
      { kind: "text", text: " mid " },
      { kind: "citation", refId: "C2" },
    ]);
  });

  it("returns a single text segment for uncited prose", () => {
    expect(toCitationSegments("Nothing cited.")).toEqual([{ kind: "text", text: "Nothing cited." }]);
  });

  it("returns a text segment for empty input rather than an empty array", () => {
    expect(toCitationSegments("")).toEqual([{ kind: "text", text: "" }]);
  });

  it("renders two adjacent chips with no gap text for a grouped bracket (issue #286)", () => {
    expect(toCitationSegments("Both agree [C7, C12] on this.")).toEqual([
      { kind: "text", text: "Both agree " },
      { kind: "citation", refId: "C7" },
      { kind: "citation", refId: "C12" },
      { kind: "text", text: " on this." },
    ]);
  });
});
