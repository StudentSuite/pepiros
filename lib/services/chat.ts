import "server-only";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { Evidence } from "@/types/anchor";
import { fastModel, strongModel } from "@/lib/ai/client";
import { buildContextBlock } from "@/lib/prompts/contextBlock";
import { extractCitedRefs } from "@/lib/chat/citations";

export { extractCitedRefs } from "@/lib/chat/citations";
import { fetchWorkspace } from "./workspace";
import { verifyClaimsAgainstCorpus } from "./verify";

/**
 * Grounded chat (docs/PLAN-V1.md §9.4). Pipeline: query rewrite -> route
 * classifier -> context block with stable ids -> answer -> parse [C7] markers
 * -> post-stream verification -> evidence rows.
 *
 * The answer is held to the same standard as a generator's output: every
 * citation it makes is re-verified against the corpus by the same
 * deterministic verifier, so a chat answer cannot claim a located quote the
 * source doesn't support. That is the whole reason chat reuses
 * buildContextBlock rather than assembling its own prompt -- citations
 * resolve through one path.
 */

export type ChatScope = "all" | "paper" | "node";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  workspaceId: string;
  question: string;
  /** Last few turns, used for the standalone-question rewrite. */
  history?: ChatTurn[];
  scope?: ChatScope;
  paperId?: string;
  /** Explicit opt-in to answering without sources (§9.4's toggle). */
  allowUngrounded?: boolean;
}

export type ChatRoute = "single_paper" | "cross_paper" | "meta";

export interface ChatCitation {
  refId: string;
  tier: Evidence["tier"];
  matchScore: number;
  quote: string | null;
  page: number | null;
}

export interface ChatResponse {
  answer: string;
  route: ChatRoute;
  /** The rewritten standalone question actually sent to the model. */
  standaloneQuestion: string;
  citations: ChatCitation[];
  /** True when the answer carries no supported citation (§9.4's amber state). */
  ungrounded: boolean;
  refused: boolean;
}


/**
 * Collapses a follow-up into a standalone question (§9.4: "query rewrite from
 * the last 4 turns"). Without this, "what about the other one?" reaches
 * retrieval with no referent and matches nothing.
 */
export async function rewriteQuestion(question: string, history: ChatTurn[]): Promise<string> {
  if (history.length === 0) return question;

  const recent = history.slice(-4);
  const { text } = await generateText({
    model: fastModel(),
    system:
      "Rewrite the user's latest message as a standalone question that makes sense without the " +
      "conversation history. Resolve pronouns and references to earlier turns. If it is already " +
      "standalone, return it unchanged. Return only the question, nothing else.",
    prompt: [
      ...recent.map((t) => `${t.role}: ${t.content}`),
      `user: ${question}`,
      "",
      "Standalone question:",
    ].join("\n"),
  });

  return text.trim() || question;
}

const RouteSchema = z.object({
  route: z.enum(["single_paper", "cross_paper", "meta"]),
});

/**
 * Routes the question (§9.4). `meta` covers questions about the workspace
 * itself ("how many papers?") rather than about the papers' content, which
 * need no source grounding and shouldn't be pushed through the refusal path.
 */
export async function classifyRoute(question: string): Promise<ChatRoute> {
  const { object } = await generateObject({
    model: fastModel(),
    schema: RouteSchema,
    system:
      "Classify a question about a set of research papers.\n" +
      "single_paper: answerable from one paper's content.\n" +
      "cross_paper: requires comparing or combining several papers.\n" +
      "meta: about the workspace itself (how many papers, what is here) rather than paper content.",
    prompt: question,
  });
  return object.route;
}

const ANSWER_SYSTEM_PROMPT = `You answer questions about research papers using only the excerpts provided.

Each excerpt is prefixed with a stable id in brackets, e.g. "[C7 | Methods | p.4]".

Rules:
- Cite with the bare id in square brackets, exactly like "[C7]" or "[N12]". Never write the full header as a citation, and never invent an id that is not in the excerpts.
- Every factual claim needs a citation. Put it immediately after the claim.
- Quote or closely paraphrase the excerpt you cite. A downstream deterministic verifier re-checks each citation against the real source text and will drop any that does not match, so inventing support does not survive.
- If the excerpts genuinely do not cover the question, say exactly: INSUFFICIENT_CONTEXT
- Do not pad. Two accurate sentences beat a paragraph of hedging.`;

/** §9.4's refusal path -- the model's own signal that the corpus can't answer. */
const REFUSAL_SENTINEL = "INSUFFICIENT_CONTEXT";

export async function answerQuestion(request: ChatRequest): Promise<ChatResponse> {
  const workspace = await fetchWorkspace(request.workspaceId);
  const standaloneQuestion = await rewriteQuestion(request.question, request.history ?? []);
  const route = await classifyRoute(standaloneQuestion);

  // Scope narrows which papers' context blocks get assembled. "node" scope
  // narrows to the node's own paper: a single node's text is too little
  // context to answer from, but its paper is the right neighbourhood.
  const scopedPaperIds =
    (request.scope === "paper" || request.scope === "node") && request.paperId
      ? [request.paperId]
      : workspace.papers.map((p) => p.id);

  const contextBlock = scopedPaperIds
    .map((paperId) => {
      const paper = workspace.papers.find((p) => p.id === paperId);
      const block = buildContextBlock(paperId, workspace.chunks, workspace.numerics);
      return paper ? `Paper: ${paper.title}\n${block}` : block;
    })
    .filter(Boolean)
    .join("\n\n");

  const { text } = await generateText({
    model: strongModel(),
    system: ANSWER_SYSTEM_PROMPT,
    prompt: `Question: ${standaloneQuestion}\n\nExcerpts:\n${contextBlock}`,
  });

  const answer = text.trim();

  if (answer.includes(REFUSAL_SENTINEL) && !request.allowUngrounded) {
    return {
      answer: "The uploaded papers do not cover this.",
      route,
      standaloneQuestion,
      citations: [],
      ungrounded: true,
      refused: true,
    };
  }

  // Post-answer verification: every ref the model cited is re-checked against
  // the corpus. The quote checked is the cited chunk's own text, so this
  // catches a hallucinated ref (nothing to resolve) rather than re-litigating
  // wording the model paraphrased -- paraphrase is allowed in prose, an
  // invented citation is not.
  const citedRefs = extractCitedRefs(answer);
  // Typed as string keys, not the inferred `C${number}` template literal, so a
  // ref parsed out of free text can be looked up without a cast.
  const chunkByRef = new Map<string, (typeof workspace.chunks)[number]>(
    workspace.chunks.map((c) => [`C${c.ordinal}`, c]),
  );
  const numericByRef = new Map<string, (typeof workspace.numerics)[number]>(
    workspace.numerics.map((n) => [`N${n.ordinal}`, n]),
  );

  const claims = citedRefs.map((refId) => {
    const chunk = chunkByRef.get(refId);
    const numeric = numericByRef.get(refId);
    const sourceChunk =
      chunk ?? (numeric ? workspace.chunks.find((c) => c.id === numeric.chunkId) : undefined);
    return { nodeId: "chat", refId, quote: sourceChunk?.text ?? "" };
  });

  const verified = verifyClaimsAgainstCorpus({
    chunks: workspace.chunks,
    numerics: workspace.numerics,
    claims,
  });

  const citations: ChatCitation[] = verified.map((result) => {
    const anchoredChunk = result.evidence.anchor
      ? workspace.chunks.find((c) => c.id === result.evidence.anchor!.chunkId)
      : undefined;
    return {
      refId: result.evidence.refId,
      tier: result.evidence.tier,
      matchScore: result.evidence.matchScore,
      quote: result.evidence.anchor?.quote ?? null,
      page: anchoredChunk?.page ?? null,
    };
  });

  const supported = citations.filter((c) => c.tier !== "unsupported");

  return {
    answer,
    route,
    standaloneQuestion,
    citations,
    // A "meta" answer is about the workspace, not its papers, so having no
    // citations is correct there rather than a grounding failure.
    ungrounded: route !== "meta" && supported.length === 0,
    refused: false,
  };
}
