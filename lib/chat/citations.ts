/**
 * Citation-marker parsing, shared by the server pipeline
 * (lib/services/chat.ts) and the client renderer
 * (components/chat/ChatDock.tsx) so the two can never disagree about what
 * counts as a citation. Deliberately not `server-only`.
 *
 * The bracket class is wider than it looks like it should be. The prompt asks
 * for ASCII `[C7]`, but Groq's gpt-oss models routinely answer with CJK
 * fullwidth brackets -- `【C7】` -- observed live, not hypothesised. With an
 * ASCII-only pattern those citations parsed as zero matches, so a correctly
 * grounded answer came back flagged ungrounded with an empty citation list.
 * Accepting the variants is the difference between the verifier seeing the
 * model's real citations and seeing none of them.
 */

const OPEN = "\\[\\uFF3B\\u3010"; // [ ［ 【
const CLOSE = "\\]\\uFF3D\\u3011"; // ] ］ 】
const REF = "[CNF]\\d+";

/**
 * One citation marker: an opening bracket variant, one or more C/N/F refs
 * (comma- and/or space-separated -- a model grouping several supporting
 * excerpts in one bracket, e.g. "[C7, C12]" or "[C7 C12]", is a real,
 * observed shape, the same class of "prompt is a request not a guarantee"
 * gap as the CJK-bracket case above: an ASCII-only single-ref pattern would
 * fail to match the bracket at all, silently dropping every ref inside it
 * instead of just the ones it can't parse.
 */
export const CITATION_PATTERN = new RegExp(
  `[${OPEN}]\\s*(${REF}(?:\\s*[,\\s]\\s*${REF})*)\\s*[${CLOSE}]`,
  "g",
);
const REF_SPLIT = /[,\s]+/;

export interface CitationMatch {
  refId: string;
  /** Index of the marker's opening bracket in the source string. */
  start: number;
  /** Index just past the marker's closing bracket. */
  end: number;
}

export function findCitations(text: string): CitationMatch[] {
  return [...text.matchAll(CITATION_PATTERN)].flatMap((m) => {
    const refs = m[1]!.split(REF_SPLIT).filter(Boolean);
    const start = m.index!;
    const end = m.index! + m[0].length;
    // Every ref inside one bracket shares that bracket's span -- there's no
    // meaningful sub-position to assign a comma-separated ref within it, and
    // toCitationSegments' cursor-advancing loop handles same-span matches
    // correctly (each renders its own chip, with no gap text between them).
    return refs.map((refId) => ({ refId, start, end }));
  });
}

/** Distinct ref ids in first-appearance order. */
export function extractCitedRefs(text: string): string[] {
  return [...new Set(findCitations(text).map((c) => c.refId))];
}

export type CitationSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; refId: string };

/**
 * Splits prose into text and citation segments, so each marker can render as a
 * real chip instead of literal bracket text.
 */
export function toCitationSegments(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let cursor = 0;

  for (const match of findCitations(text)) {
    if (match.start > cursor) segments.push({ kind: "text", text: text.slice(cursor, match.start) });
    segments.push({ kind: "citation", refId: match.refId });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });

  return segments.length > 0 ? segments : [{ kind: "text", text }];
}
