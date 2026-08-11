import "server-only";
import { generateObject, type LanguageModel } from "ai";
import type { PaperArchetype } from "@/types/anchor";
import { GeneratorOutputSchema, type GeneratorName, type GeneratorOutput } from "@/lib/schemas";

/**
 * Shared harness every generator (docs/PLAN-V1.md §8) runs through, so each
 * generator file only supplies what's actually specific to it: a system
 * prompt and a model tier.
 */

export interface GeneratorContext {
  paperTitle: string;
  archetype: PaperArchetype;
  /** lib/prompts/contextBlock.ts's output -- the paper's full stable-id context block. */
  contextBlock: string;
  /** Only present for the `custom` generator (docs/PLAN-V1.md §7's anti-template leaf). */
  customPrompt?: string;
}

export interface GeneratorConfig {
  name: GeneratorName;
  /** Content-specific instructions only -- the citation-marker contract below is shared. */
  systemPrompt: string;
  model: () => LanguageModel;
}

/**
 * The citation contract every generator shares: cite only ids from the
 * context block (never invent one), and mark each `evidence[]` entry's
 * position in `body_md` with `[^n{index}]` -- a notional marker distinct from
 * the final `[^e7]`-style ids, which don't exist yet because they're assigned
 * after lib/services/verify.ts re-verifies each claim server-side. See
 * bindEvidenceMarkers below for the substitution.
 */
const SHARED_SYSTEM_PROMPT = `You are writing one section of a research paper breakdown. You will be given a context block of numbered excerpts, each prefixed with a bracketed header like "[C7 | Methods | p.4]" or "[N12 | Results | p.5]".

Rules:
- A ref is ONLY the bare id at the start of the header -- "C7" or "N12". Never the full header. Do NOT write "C7 | Methods | p.4" as a ref -- write "C7". This matters: refs are matched by exact string against a lookup table that only has the bare ids in it, so anything else fails to resolve, even if it looks like a reasonable citation.
- Only cite ids that appear in the context block. Never invent one.
- Every factual claim in body_md must be backed by at least one citation.
- In body_md, mark each claim with a notional marker "[^n0]", "[^n1]", ... matching that claim's index in the evidence array (zero-based, in the order they first appear in body_md). Do not use any other footnote syntax.
- evidence[i].refs lists every bare id that backs marker "[^n{i}]" -- an aggregate claim drawing on multiple excerpts gets multiple refs in one entry (e.g. ["C4", "C5"]), not one entry per ref.
- evidence[i].quote is copied verbatim from the source excerpt(s), not paraphrased -- paraphrasing here defeats the point, since a downstream deterministic verifier re-checks this quote against the source text and demotes anything that doesn't match closely enough.
- followups are 2-4 short questions a reader might click to go deeper, not restatements of the title.`;

export async function runGenerator(config: GeneratorConfig, ctx: GeneratorContext): Promise<GeneratorOutput> {
  const prompt = `Paper: ${ctx.paperTitle}
Archetype: ${ctx.archetype}
${ctx.customPrompt ? `\nAdditional instruction for this leaf: ${ctx.customPrompt}\n` : ""}
Context block:
${ctx.contextBlock}`;

  const result = await generateObject({
    model: config.model(),
    schema: GeneratorOutputSchema,
    system: `${SHARED_SYSTEM_PROMPT}\n\n${config.systemPrompt}`,
    prompt,
  });

  return result.object;
}

/**
 * Replaces each notional "[^n{i}]" marker with the real, already-formatted
 * marker(s) the caller assigned after verification -- positional, index i is
 * the replacement for evidence[i]. A single-ref claim's replacement is one
 * marker ("[^e7]"); a multi-ref claim (docs/PLAN-V1.md §4's aggregate-claim
 * case) verifies each ref as its own Evidence row and its replacement is
 * their concatenation ("[^e7][^e8]"), since one evidence row still means one
 * ref each -- see lib/agents/orchestrator.ts's `verifyGeneratorOutput`.
 */
export function bindEvidenceMarkers(bodyMd: string, markerReplacements: string[]): string {
  return markerReplacements.reduce(
    (body, replacement, i) => body.split(`[^n${i}]`).join(replacement),
    bodyMd,
  );
}

/**
 * Defense-in-depth for generators whose spec explicitly bans generic
 * boilerplate critique (weaknesses, biases -- docs/PLAN-V1.md §8): "prompt
 * enforcement" alone is exactly the kind of claim this project doesn't trust
 * on its own elsewhere (plan.md §4's whole thesis), so this gives a caller a
 * deterministic signal instead of only hoping the model complied. Returns
 * the banned phrases actually found, empty if none.
 */
export function findBannedPhrases(text: string, bannedPhrases: string[]): string[] {
  const normalized = text.toLowerCase();
  return bannedPhrases.filter((phrase) => normalized.includes(phrase.toLowerCase()));
}
