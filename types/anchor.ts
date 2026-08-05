/**
 * Frozen contract (plan.md §8): both lib/ and components/ code against this
 * file and fixtures/workspace.json, not against each other.
 *
 * A "quote located" badge (plan.md §4) proves quotation provenance, not
 * entailment -- never rename these fields to imply "verified".
 */

export type EvidenceTier = "quote_located" | "paraphrase" | "unsupported";

/** One contiguous highlight rect in PDF page space (72dpi points, origin top-left). */
export interface AnchorRect {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A located quote. Multi-span is required, not optional (plan.md §4) --
 * aggregate claims have no single contiguous source sentence, so `spans`
 * is always an array, even for the common single-span case.
 */
export interface Anchor {
  chunkId: string;
  quote: string;
  spans: AnchorRect[];
}

export interface Evidence {
  id: string;
  nodeId: string;
  /** Stable citation id as shown to the model, e.g. "C7", "F3", "N12". */
  refId: string;
  anchor: Anchor | null;
  tier: EvidenceTier;
  /** token_set_ratio(normalize(quote), normalize(chunk.text)), 0-1. */
  matchScore: number;
  /** Entailment overlap floor: every number/unit/comparator in the claim
   *  also appears in the anchored span's numerics. Null when the claim has
   *  no numeric content to check. */
  numericOk: boolean | null;
}

export type ChunkKind = "prose" | "figure_caption" | "table" | "equation";

export interface Chunk {
  id: string;
  paperId: string;
  sectionId: string | null;
  kind: ChunkKind;
  page: number;
  text: string;
  /** Bounding rects for the whole chunk, used as the anchor search window. */
  rects: AnchorRect[];
}

export type NumericComparator = "=" | "<" | ">" | "<=" | ">=" | "~";

export interface Numeric {
  id: string;
  chunkId: string;
  rawText: string;
  value: number;
  unit: string | null;
  comparator: NumericComparator | null;
  /** e.g. "p", "ci_low", "ci_high", "effect_size", "n" */
  role: string;
}

export type NodeType = "paper" | "pillar" | "leaf" | "thread" | "synthesis";

export interface GraphNode {
  id: string;
  workspaceId: string;
  type: NodeType;
  title: string;
  bodyMd: string;
  /** Which pillar's colour this node inherits structurally (plan.md §10). */
  pillarIndex: number | null;
  x: number;
  y: number;
  paperId: string | null;
  stale: boolean;
}

export type EdgeKind =
  | "contains"
  | "relates"
  | "derived_from"
  | "agrees"
  | "contradicts"
  | "extends"
  | "shares_method"
  | "cites";

export interface GraphEdge {
  id: string;
  workspaceId: string;
  kind: EdgeKind;
  sourceId: string;
  targetId: string;
}

export type PaperArchetype =
  | "rct"
  | "observational"
  | "meta_analysis"
  | "review"
  | "methods"
  | "theory";

export interface Paper {
  id: string;
  workspaceId: string;
  title: string;
  authors: string[];
  year: number | null;
  archetype: PaperArchetype | null;
  sourceUrl: string | null;
  pdfStoragePath: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  papers: Paper[];
  chunks: Chunk[];
  numerics: Numeric[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  evidence: Evidence[];
}
