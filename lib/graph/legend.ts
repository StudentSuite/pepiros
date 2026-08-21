import type { EdgeKind, NodeType, Workspace } from "@/types/anchor";

/**
 * What the canvas's colours and line styles mean, in one place.
 *
 * The canvas renders 5 node types, 7 pillar hues and 8 edge kinds with 3 dash
 * patterns. Every one of those was decided in a component and explained
 * nowhere: the only in-canvas hint was a label that appears when you hover an
 * individual edge, which cannot tell you a legend exists. A reader either
 * already knew the scheme or was looking at decoration.
 *
 * This module is the source the legend renders from, so the key cannot drift
 * from what the graph actually draws -- a legend that disagrees with the
 * picture is worse than none.
 */

export interface EdgeKindMeaning {
  kind: EdgeKind;
  label: string;
  /** What this edge asserts, in a reader's words rather than the schema's. */
  meaning: string;
  /** Matches GraphEdge.tsx's DASH table; null is a solid line. */
  dash: string | null;
  /** "structure" is the contains tree; the rest are claims about content. */
  group: "structure" | "relation" | "judgement";
}

/**
 * Order is deliberate: structure first (it is most of the lines on screen),
 * then relations, then the two that carry a verdict, since those are the ones
 * worth hunting for.
 */
export const EDGE_KIND_MEANINGS: EdgeKindMeaning[] = [
  {
    kind: "contains",
    label: "contains",
    meaning: "Structure: a paper holds a pillar, a pillar holds a claim.",
    dash: null,
    group: "structure",
  },
  {
    kind: "cites",
    label: "cites",
    meaning: "This paper references the other one.",
    dash: null,
    group: "relation",
  },
  {
    kind: "shares_method",
    label: "shares method",
    meaning: "Both used the same approach, so their results are comparable.",
    // Issue #249: was null (solid), identical to cites above at default
    // zoom whenever both share ink-muted (i.e. not pillar-tinted) -- the
    // two were undecodable as separate kinds.
    dash: "5 3",
    group: "relation",
  },
  {
    kind: "relates",
    label: "relates to",
    meaning: "Same subject, no stronger claim than that.",
    dash: "9 4",
    group: "relation",
  },
  {
    kind: "derived_from",
    label: "derived from",
    meaning: "This note was written out of that source claim.",
    // Issue #249: was "6 4", identical to relates above. A dash-dot rhythm
    // reads as a distinct pattern rather than the same dash at a slightly
    // different pace.
    dash: "1 3 5 3",
    group: "relation",
  },
  {
    kind: "extends",
    label: "extends",
    meaning: "Builds further on the other paper's finding.",
    dash: "1 3",
    group: "relation",
  },
  {
    kind: "agrees",
    label: "agrees with",
    meaning: "Two papers found the same thing, each with its own quote.",
    dash: null,
    group: "judgement",
  },
  {
    kind: "contradicts",
    label: "contradicts",
    meaning: "Two papers disagree, and both sides have a located quote.",
    dash: "6 6",
    group: "judgement",
  },
];

export interface NodeTypeMeaning {
  type: NodeType;
  label: string;
  meaning: string;
}

export const NODE_TYPE_MEANINGS: NodeTypeMeaning[] = [
  { type: "paper", label: "Paper", meaning: "One source document." },
  { type: "pillar", label: "Pillar", meaning: "A theme the paper is broken into. Click to open it." },
  { type: "leaf", label: "Claim", meaning: "A single generated claim, bound to a quote." },
  { type: "synthesis", label: "Synthesis", meaning: "A finding drawn across several papers." },
  { type: "thread", label: "Reading path", meaning: "A suggested route through the papers." },
];

export const TIER_MEANINGS = [
  {
    tier: "quote_located" as const,
    label: "Quote located",
    meaning: "The quote was found in the source. It does not mean the claim follows from it.",
  },
  {
    tier: "paraphrase" as const,
    label: "Paraphrase",
    meaning: "Close to the source wording, but not verbatim.",
  },
  {
    tier: "unsupported" as const,
    label: "Unsupported",
    meaning: "The quote did not match, so the anchor was dropped.",
  },
];

/**
 * Only the edge kinds actually drawn in this workspace.
 *
 * Listing all 8 always would mean a two-paper graph shows a key for five
 * lines it does not contain, which is the kind of "complete" documentation
 * that makes a picture harder to read rather than easier.
 */
export function presentEdgeKinds(workspace: Workspace): EdgeKindMeaning[] {
  const present = new Set(workspace.edges.map((e) => e.kind));
  return EDGE_KIND_MEANINGS.filter((m) => present.has(m.kind));
}

/** Pillar hues in use, with the pillar's own title as its label. */
export function presentPillars(workspace: Workspace): Array<{ index: number; title: string }> {
  const seen = new Map<number, string>();
  for (const node of workspace.nodes) {
    if (node.type !== "pillar" || node.pillarIndex === null) continue;
    if (!seen.has(node.pillarIndex)) seen.set(node.pillarIndex, node.title);
  }
  return [...seen.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, title]) => ({ index, title }));
}

export function presentNodeTypes(workspace: Workspace): NodeTypeMeaning[] {
  const present = new Set(workspace.nodes.map((n) => n.type));
  return NODE_TYPE_MEANINGS.filter((m) => present.has(m.type));
}
