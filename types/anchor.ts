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
  /**
   * The n in the "C{n}" id a model is shown. Persisted at ingest and unique
   * within the workspace, never derived from array position: evidence rows
   * store the rendered ref, so renumbering would silently re-point already
   * written citations at different text.
   */
  ordinal: number;
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
  /** The n in "N{n}". Same stability contract as Chunk.ordinal. */
  ordinal: number;
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
  /**
   * 2-4 follow-up questions a reader might click to go deeper (docs/PLAN-V1.md
   * §9.4), generated alongside the node's own content. Optional and additive:
   * every existing node (including the whole fixture) predates this field, so
   * its absence just means "no follow-ups to offer," not a render error.
   */
  followups?: string[];
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

/**
 * Closed set, and the same closed set lib/agents/archetypeClassifier.ts
 * classifies into. These two drifted apart once already while the classifier
 * was a stub (reconciled since); exporting the runtime array here, and having
 * lib/schemas/index.ts build its zod enum from it instead of a second
 * hand-typed list, is what keeps that from happening again.
 */
export const PAPER_ARCHETYPES = [
  "rct",
  "cohort_study",
  "systematic_review",
  "method_paper",
  "ml_model",
  "case_report",
  "bioinformatics_pipeline",
  "preprint_theory",
  "dataset_paper",
] as const;

export type PaperArchetype = (typeof PAPER_ARCHETYPES)[number];

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
