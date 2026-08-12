import type { Chunk } from "@/types/anchor";
import { formatChunkLine } from "@/lib/prompts/contextBlock";
import { tokenize } from "@/lib/grounding/fuzzy";
import { fetchWorkspace } from "./workspace";

/**
 * `search_paper` (docs/PLAN-V1.md §13.2), backing both the MCP tool and any
 * HTTP caller.
 *
 * Deliberately keyword scoring, not vector search: plan.md §2 killed
 * pgvector/embeddings because a whole paper fits in context behind a prompt
 * cache, addressed by stable citation ids. So this is not "search as
 * retrieval-for-RAG" -- it is "let a caller find the chunk ids it should be
 * citing", which is a lookup problem, and a deterministic one.
 *
 * Scoring is coverage-of-query-terms, which is the honest thing to optimize
 * here. TF-IDF would rank a chunk that repeats one query word above a chunk
 * containing all of them; for "which chunk should I cite", covering more of
 * the question matters more than repeating part of it.
 */

export interface SearchHit {
  /** The stable "C{n}" id the caller must cite, never an array index. */
  refId: string;
  chunkId: string;
  paperId: string;
  page: number;
  /** Verbatim chunk text -- §13.2 requires every result carry the real quote. */
  text: string;
  /** Pre-rendered `[C7 | Methods | p.4] ...` line, identical to what generators see. */
  line: string;
  /** Fraction of distinct query terms present in this chunk, 0-1. */
  score: number;
}

export interface SearchPaperInput {
  workspaceId: string;
  query: string;
  paperId?: string;
  k?: number;
}

const DEFAULT_K = 5;

function scoreChunk(chunk: Chunk, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0;
  const chunkTerms = new Set(tokenize(chunk.text));
  const matched = queryTerms.filter((term) => chunkTerms.has(term)).length;
  return matched / queryTerms.length;
}

export async function searchPaper({
  workspaceId,
  query,
  paperId,
  k = DEFAULT_K,
}: SearchPaperInput): Promise<SearchHit[]> {
  const workspace = await fetchWorkspace(workspaceId);
  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0) return [];

  const candidates = paperId
    ? workspace.chunks.filter((c) => c.paperId === paperId)
    : workspace.chunks;

  return candidates
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTerms) }))
    .filter(({ score }) => score > 0)
    // Ties break on ordinal, not on array position, so the same query always
    // returns the same order -- an MCP client that cites hit #2 should get the
    // same chunk on a re-run.
    .sort((a, b) => b.score - a.score || a.chunk.ordinal - b.chunk.ordinal)
    .slice(0, k)
    .map(({ chunk, score }) => ({
      refId: `C${chunk.ordinal}`,
      chunkId: chunk.id,
      paperId: chunk.paperId,
      page: chunk.page,
      text: chunk.text,
      line: formatChunkLine(chunk),
      score,
    }));
}

/**
 * `paper_facts` with `kind: "numeric_ledger"`. The numerics table already
 * exists and is what the entailment floor checks against, so exposing it over
 * MCP is a read, not new extraction.
 */
export async function paperNumericLedger(workspaceId: string, paperId: string) {
  const workspace = await fetchWorkspace(workspaceId);
  const paperChunkIds = new Set(
    workspace.chunks.filter((c) => c.paperId === paperId).map((c) => c.id),
  );
  return workspace.numerics
    .filter((n) => paperChunkIds.has(n.chunkId))
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((n) => ({
      refId: `N${n.ordinal}`,
      rawText: n.rawText,
      value: n.value,
      unit: n.unit,
      comparator: n.comparator,
      role: n.role,
      chunkId: n.chunkId,
    }));
}

/**
 * `paper_facts` with `kind: "coverage"`. Fraction of a paper's chunks that at
 * least one kept anchor points at -- the "how much of this paper did we
 * actually ground" number, which is the honest counterpart to a drop rate.
 * An `unsupported` row has its anchor dropped by the verifier, so it
 * correctly does not count as coverage here.
 */
export async function paperCoverage(workspaceId: string, paperId: string) {
  const workspace = await fetchWorkspace(workspaceId);
  const paperChunks = workspace.chunks.filter((c) => c.paperId === paperId);
  const paperChunkIds = new Set(paperChunks.map((c) => c.id));

  const anchoredChunkIds = new Set(
    workspace.evidence
      .filter((e) => e.anchor && paperChunkIds.has(e.anchor.chunkId))
      .map((e) => e.anchor!.chunkId),
  );

  return {
    totalChunks: paperChunks.length,
    anchoredChunks: anchoredChunkIds.size,
    coverage: paperChunks.length === 0 ? 0 : anchoredChunkIds.size / paperChunks.length,
  };
}
