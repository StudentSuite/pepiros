import "server-only";
import { generateObject, type LanguageModel, type ModelMessage } from "ai";
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
  /**
   * Only present for the `figures` generator (issue #59): the paper's cropped
   * figure images, each labeled with the ref id of its `figure_caption` chunk
   * in contextBlock so the model can tell the model which caption text each
   * image goes with. Kept in-memory only -- nothing here is persisted to disk
   * or a DB row, since the generator's own citation (to the caption chunk) is
   * the durable, re-verifiable record; the image is just what made the call
   * possible in the first place.
   */
  images?: Array<{ refId: string; base64: string; mediaType: string }>;
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
  const textPrompt = `Paper: ${ctx.paperTitle}
Archetype: ${ctx.archetype}
${ctx.customPrompt ? `\nAdditional instruction for this leaf: ${ctx.customPrompt}\n` : ""}
Context block:
${ctx.contextBlock}`;

  // Plain string prompt for every generator except `figures` -- the one
  // caller that needs an actual image alongside the text, not just text
  // referencing an id. AI SDK v5 accepts `prompt: string | ModelMessage[]`.
  let prompt: string | ModelMessage[] = textPrompt;
  if (ctx.images?.length) {
    const imageParts = ctx.images.flatMap((image) => [
      { type: "text" as const, text: `Image for ref ${image.refId}:` },
      { type: "image" as const, image: image.base64, mediaType: image.mediaType },
    ]);
    prompt = [
      {
        role: "user",
        content: [{ type: "text", text: textPrompt }, ...imageParts],
      },
    ];
  }

  const result = await generateObject({
    model: config.model(),
    schema: GeneratorOutputSchema,
    system: `${SHARED_SYSTEM_PROMPT}\n\n${config.systemPrompt}`,
    prompt,
    // Same "a prompt is a request, not a guarantee" class as normalizeRef()
    // and lib/chat/citations.ts's CJK-bracket tolerance: observed live from
    // visionModel()'s free OpenRouter model, which wrapped an otherwise
    // perfectly valid response in a "```json ... ```" markdown fence despite
    // supportsStructuredOutputs -- OpenRouter's free-tier routing doesn't
    // strictly enforce response_format across every backend it proxies to.
    // Harmless for every other generator/model, which never hits this path
    // since it only runs after the default parse already failed.
    experimental_repairText: async ({ text }) => {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      return fenced?.[1] ?? null;
    },
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
 * ref each -- see lib/services/verify.ts's `verifyAndBindClaims`.
 *
 * Also matches "^[n{i}]" (bracket/caret swapped) -- observed live from a real
 * Groq call despite the prompt spelling out "[^n0]" explicitly. Same "a
 * prompt is a request, not a guarantee" class as normalizeRef and
 * lib/chat/citations.ts's CJK-bracket tolerance.
 */
export function bindEvidenceMarkers(bodyMd: string, markerReplacements: string[]): string {
  return markerReplacements.reduce(
    (body, replacement, i) => body.replace(new RegExp(`\\[\\^n${i}\\]|\\^\\[n${i}\\]`, "g"), () => replacement),
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
