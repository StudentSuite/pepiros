import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { fastModel } from "@/lib/ai/client";
import { fetchWorkspace } from "./workspace";

/**
 * Quiz generation (docs/PLAN-V1.md §8's `quiz` generator), derived from
 * whatever workspace is actually loaded instead of four questions hardcoded
 * to the fixture's authors and citation ids.
 *
 * This does not re-verify anything: a quiz question tests knowledge of a
 * claim that's already `quote_located` on some leaf node, it doesn't assert
 * a new one. So the grounding work is just picking leaves whose evidence
 * already cleared the fuzzy-match floor -- quizzing on a paraphrased or
 * unsupported claim would ask the reader to memorize something the grounding
 * spine itself doesn't stand behind.
 */

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  citationRefId: string;
}

const MAX_QUESTIONS = 6;

const QuestionSchema = z.object({
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

const SYSTEM_PROMPT = `Write one multiple-choice quiz question testing the specific fact given below.
Exactly four options, exactly one correct (give its 0-based index).
The explanation must restate the quoted evidence -- it is not a place to introduce a new claim.
Wrong options should be plausible (real numbers/directions from the same domain), not absurd.`;

export async function generateQuiz(workspaceId: string): Promise<QuizQuestion[]> {
  const workspace = await fetchWorkspace(workspaceId);

  const groundedLeaves = workspace.nodes
    .filter((n) => n.type === "leaf")
    .map((leaf) => ({
      leaf,
      evidence: workspace.evidence.find((e) => e.nodeId === leaf.id && e.tier === "quote_located" && e.anchor),
    }))
    .filter((x): x is { leaf: typeof x.leaf; evidence: NonNullable<typeof x.evidence> } => Boolean(x.evidence))
    .slice(0, MAX_QUESTIONS);

  return Promise.all(
    groundedLeaves.map(async ({ leaf, evidence }) => {
      const { object } = await generateObject({
        model: fastModel(),
        schema: QuestionSchema,
        system: SYSTEM_PROMPT,
        prompt: `Fact: ${leaf.title}\nQuote: "${evidence.anchor!.quote}"\nContext: ${leaf.bodyMd.replace(/\[\^[\w-]+\]/g, "")}`,
      });

      return {
        id: `quiz-${leaf.id}`,
        prompt: object.prompt,
        options: object.options,
        correctIndex: object.correctIndex,
        explanation: object.explanation,
        citationRefId: evidence.refId,
      } satisfies QuizQuestion;
    }),
  );
}
